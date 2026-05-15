/**
 * Edge Function: send-push (v2)
 *
 * Multi-target dispatcher that routes a single payload to the right
 * transport based on the subscription endpoint prefix:
 *
 *   `https://…`     → Web Push (VAPID)
 *   `ios:<token>`   → APNs HTTP/2 with ES256 JWT signed using the .p8 key
 *   `android:<tok>` → FCM HTTP v1 with a Google service account
 *
 * Audience grammar (unchanged from v1):
 *
 *     { type: 'user', uid: '...' }
 *     { type: 'all' }
 *     { type: 'role', role: 'EDITOR' | ... }
 *     { type: 'follows', author: 'Marie' }
 *
 * Required secrets (set with `supabase secrets set …`):
 *   Web:
 *     VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
 *   APNs (iOS):
 *     APNS_TEAM_ID         — Apple Developer team id
 *     APNS_KEY_ID          — .p8 key id from Apple Developer
 *     APNS_PRIVATE_KEY     — full PEM-encoded .p8 content
 *     APNS_BUNDLE_ID       — iOS bundle id, e.g. app.cakenews.app
 *     APNS_USE_SANDBOX     — '1' for the sandbox host, omit for prod
 *   FCM (Android):
 *     FCM_PROJECT_ID       — Firebase project id
 *     FCM_SERVICE_ACCOUNT  — JSON-stringified service-account credentials
 *
 * Failures on a single subscription do NOT abort the others; the
 * response body returns counters so a monitor can spot misconfigured
 * channels.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3?bundle';
import { create as createJwt, getNumericDate } from 'https://deno.land/x/[email protected]/mod.ts';
import { buildCors, handlePreflight } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitedResponse } from '../_shared/rate-limit.ts';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ops@cakenews.app';

const APNS_TEAM_ID      = Deno.env.get('APNS_TEAM_ID') ?? '';
const APNS_KEY_ID       = Deno.env.get('APNS_KEY_ID') ?? '';
const APNS_PRIVATE_KEY  = Deno.env.get('APNS_PRIVATE_KEY') ?? '';
const APNS_BUNDLE_ID    = Deno.env.get('APNS_BUNDLE_ID') ?? '';
const APNS_USE_SANDBOX  = Deno.env.get('APNS_USE_SANDBOX') === '1';

const FCM_PROJECT_ID    = Deno.env.get('FCM_PROJECT_ID') ?? '';
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT') ?? '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const METHODS = ['POST', 'OPTIONS'];

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

interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_uid: string;
}

interface DispatchOutcome {
  ok: boolean;
  prune?: boolean;
  channel: 'web' | 'ios' | 'android';
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, METHODS);
  if (preflight) return preflight;
  const cors = buildCors(req, METHODS);
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Auth: only allow staff or service-role calls.
  const authorization = req.headers.get('Authorization');
  const isService = authorization === `Bearer ${SERVICE_ROLE_KEY}`;
  let rateLimitKey: string | null = null;
  if (!isService) {
    if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'missing_bearer_token' }, cors);
    const { data: { user } } = await admin.auth.getUser(authorization.slice('Bearer '.length));
    if (!user) return json(401, { error: 'invalid_token' }, cors);
    const role = (user.app_metadata?.role as string | undefined) ?? 'USER';
    if (!['EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return json(403, { error: 'forbidden' }, cors);
    }
    rateLimitKey = `send-push:${user.id}`;
  }

  // Throttle staff dispatches: 30 broadcasts per editor per hour. The
  // service-role bypass is intentional — cron and scheduled jobs need
  // unbounded access. Editor abuse is the realistic threat.
  if (rateLimitKey) {
    const verdict = await checkRateLimit(admin, {
      key: rateLimitKey,
      max: 30,
      windowSeconds: 3600,
    });
    if (!verdict.allowed) return rateLimitedResponse(verdict, cors);
  }

  let body: { audience: Audience; payload: PushPayload };
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }, cors); }
  if (!body?.audience?.type || !body?.payload?.title) {
    return json(400, { error: 'missing_audience_or_payload' }, cors);
  }

  const subscriptions = await resolveAudience(admin, body.audience);

  const stats = { web: 0, ios: 0, android: 0, pruned: 0, failed: 0 };
  await Promise.all(subscriptions.map(async (sub) => {
    const outcome = await dispatch(sub, body.payload);
    if (outcome.ok) {
      stats[outcome.channel] += 1;
    } else {
      stats.failed += 1;
      if (outcome.prune) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        stats.pruned += 1;
      }
    }
  }));

  return json(200, { audience: subscriptions.length, ...stats }, cors);
});

// ----------------------------------------------------------------------------
// Audience resolution (unchanged from v1)
// ----------------------------------------------------------------------------

async function resolveAudience(admin: ReturnType<typeof createClient>, audience: Audience): Promise<Subscription[]> {
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
  const { data } = await query;
  return (data ?? []) as Subscription[];
}

// ----------------------------------------------------------------------------
// Channel dispatchers
// ----------------------------------------------------------------------------

async function dispatch(sub: Subscription, payload: PushPayload): Promise<DispatchOutcome> {
  if (sub.endpoint.startsWith('ios:'))     return await dispatchApns(sub, payload);
  if (sub.endpoint.startsWith('android:')) return await dispatchFcm(sub, payload);
  return await dispatchWebPush(sub, payload);
}

async function dispatchWebPush(sub: Subscription, payload: PushPayload): Promise<DispatchOutcome> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { ok: false, channel: 'web' };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, channel: 'web' };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, prune: status === 404 || status === 410, channel: 'web' };
  }
}

async function dispatchApns(sub: Subscription, payload: PushPayload): Promise<DispatchOutcome> {
  if (!APNS_TEAM_ID || !APNS_KEY_ID || !APNS_PRIVATE_KEY || !APNS_BUNDLE_ID) {
    return { ok: false, channel: 'ios' };
  }
  const deviceToken = sub.endpoint.slice('ios:'.length);
  try {
    const jwt = await apnsJwt();
    const host = APNS_USE_SANDBOX ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    const url = `https://${host}/3/device/${deviceToken}`;
    const apnsBody = {
      aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' },
      url: payload.url,
      tag: payload.tag,
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(apnsBody),
    });
    if (resp.ok) return { ok: true, channel: 'ios' };
    // 410 Gone (BadDeviceToken / Unregistered) → prune the row.
    if (resp.status === 410 || resp.status === 400) return { ok: false, prune: true, channel: 'ios' };
    return { ok: false, channel: 'ios' };
  } catch {
    return { ok: false, channel: 'ios' };
  }
}

async function dispatchFcm(sub: Subscription, payload: PushPayload): Promise<DispatchOutcome> {
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return { ok: false, channel: 'android' };
  }
  const deviceToken = sub.endpoint.slice('android:'.length);
  try {
    const accessToken = await fcmAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url ?? '', tag: payload.tag ?? '' },
        },
      }),
    });
    if (resp.ok) return { ok: true, channel: 'android' };
    if (resp.status === 404 || resp.status === 403) {
      // 404 = UNREGISTERED; prune.
      return { ok: false, prune: true, channel: 'android' };
    }
    return { ok: false, channel: 'android' };
  } catch {
    return { ok: false, channel: 'android' };
  }
}

// ----------------------------------------------------------------------------
// APNs JWT helper (ES256, refreshed every 50 min)
// ----------------------------------------------------------------------------

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

async function apnsJwt(): Promise<string> {
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > Date.now() + 60_000) {
    return cachedApnsJwt.token;
  }
  const key = await importPkcs8(APNS_PRIVATE_KEY, 'ECDSA');
  const token = await createJwt(
    { alg: 'ES256', kid: APNS_KEY_ID, typ: 'JWT' },
    { iss: APNS_TEAM_ID, iat: getNumericDate(0) },
    key,
  );
  cachedApnsJwt = { token, expiresAt: Date.now() + 50 * 60_000 };
  return token;
}

// ----------------------------------------------------------------------------
// FCM access-token helper (OAuth2 JWT-bearer flow with the service
// account; cached until expiry-30s)
// ----------------------------------------------------------------------------

let cachedFcmToken: { token: string; expiresAt: number } | null = null;

interface FcmServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

async function fcmAccessToken(): Promise<string> {
  if (cachedFcmToken && cachedFcmToken.expiresAt > Date.now() + 30_000) {
    return cachedFcmToken.token;
  }
  const sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as FcmServiceAccount;
  const key = await importPkcs8(sa.private_key, 'RSA');
  const now = getNumericDate(0);
  const jwt = await createJwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(60 * 60),
      iat: now,
    },
    key,
  );

  const form = new URLSearchParams();
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  form.set('assertion', jwt);
  const resp = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!resp.ok) throw new Error('fcm_token_request_failed');
  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedFcmToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 30) * 1000,
  };
  return cachedFcmToken.token;
}

// ----------------------------------------------------------------------------
// PKCS#8 → CryptoKey helper. Accepts an RSA or ECDSA private key in
// PEM form and imports it for djwt signing.
// ----------------------------------------------------------------------------

async function importPkcs8(pem: string, family: 'RSA' | 'ECDSA'): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  const algo = family === 'RSA'
    ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' as const }
    : { name: 'ECDSA', namedCurve: 'P-256' as const };
  return await crypto.subtle.importKey(
    'pkcs8',
    der as unknown as ArrayBuffer,
    algo,
    false,
    ['sign'],
  );
}

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
