/**
 * Edge Function: send-push
 *
 * Server-side fan-out of Web Push notifications. Accepts an
 * `audience` selector + `payload` body and dispatches a push to every
 * subscription that matches.
 *
 * Audience grammar (initial — extend as needed):
 *
 *     { type: 'user', uid: '...' }              → one user
 *     { type: 'all' }                           → every subscriber
 *     { type: 'role', role: 'EDITOR' | ... }    → users with role
 *     { type: 'follows', author: 'Marie' }      → users following an author
 *
 * The payload is JSON-stringified into the push envelope and consumed
 * by the service worker's `push` listener (already implemented in
 * `sw.js`).
 *
 * Required environment variables:
 *   - VAPID_PUBLIC_KEY  /  VAPID_PRIVATE_KEY   (web-push VAPID pair)
 *   - VAPID_SUBJECT                            ("mailto:ops@cakenews…")
 *   - SUPABASE_URL  /  SUPABASE_SERVICE_ROLE_KEY
 *
 * This function MUST be invoked with a service role token or from a
 * signed-in admin — we re-check the claim before dispatching.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// `web-push` is a thin Deno-compatible wrapper that handles the VAPID
// signature + AES-GCM encryption pipeline so we don't have to.
import webpush from 'https://esm.sh/web-push@3?bundle';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ops@cakenews.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface Audience {
  type: 'user' | 'all' | 'role' | 'follows';
  uid?: string;
  role?: string;
  author?: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  tone?: string;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Auth: only allow staff or service-role calls.
  const authorization = req.headers.get('Authorization');
  const isService = authorization === `Bearer ${SERVICE_ROLE_KEY}`;
  if (!isService) {
    if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'missing_bearer_token' });
    const { data: { user } } = await admin.auth.getUser(authorization.slice('Bearer '.length));
    if (!user) return json(401, { error: 'invalid_token' });
    const role = (user.app_metadata?.role as string | undefined) ?? 'USER';
    if (!['EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return json(403, { error: 'forbidden' });
    }
  }

  let body: { audience: Audience; payload: PushPayload };
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  if (!body?.audience?.type || !body?.payload?.title) {
    return json(400, { error: 'missing_audience_or_payload' });
  }

  const subscriptions = await resolveAudience(admin, body.audience);
  const message = JSON.stringify(body.payload);

  let success = 0;
  let dropped = 0;
  await Promise.all(subscriptions.map(async (s) => {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(sub, message);
      success += 1;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404 / 410 = subscription gone, prune from the table.
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        dropped += 1;
      }
    }
  }));

  return json(200, { sent: success, pruned: dropped, audience: subscriptions.length });
});

async function resolveAudience(admin: ReturnType<typeof createClient>, audience: Audience) {
  // We deliberately fetch only the columns the dispatch needs.
  let query = admin.from('push_subscriptions').select('endpoint, p256dh, auth, user_uid');
  if (audience.type === 'user' && audience.uid) {
    query = query.eq('user_uid', audience.uid);
  } else if (audience.type === 'role' && audience.role) {
    const { data: roleUsers } = await admin.from('users').select('uid').eq('role', audience.role);
    const uids = (roleUsers ?? []).map((u: { uid: string }) => u.uid);
    if (uids.length === 0) return [];
    query = query.in('user_uid', uids);
  } else if (audience.type === 'follows' && audience.author) {
    const { data: followers } = await admin
      .from('follows').select('follower_uid')
      .eq('kind', 'author').eq('value', audience.author);
    const uids = (followers ?? []).map((f: { follower_uid: string }) => f.follower_uid);
    if (uids.length === 0) return [];
    query = query.in('user_uid', uids);
  }
  // 'all' falls through with the unfiltered query.
  const { data } = await query;
  return (data ?? []) as Array<{ endpoint: string; p256dh: string; auth: string; user_uid: string }>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
