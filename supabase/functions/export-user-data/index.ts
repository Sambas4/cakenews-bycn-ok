/**
 * Edge Function: export-user-data
 *
 * GDPR Article 15 — every user has the right to obtain a copy of the
 * personal data we hold about them. This function gathers every row
 * tied to the authenticated caller across the database and returns a
 * single JSON envelope the client can save / email to themselves.
 *
 * Important: we deliberately *do not* include rows that mention the
 * user via foreign keys but whose primary content belongs to someone
 * else (e.g. a comment thread the user replied in but didn't author).
 * We export only the data the user owns.
 *
 * The response is gzipped automatically by Supabase Functions.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCors, handlePreflight } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitedResponse } from '../_shared/rate-limit.ts';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const METHODS = ['POST', 'OPTIONS'];

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, METHODS);
  if (preflight) return preflight;
  const cors = buildCors(req, METHODS);
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json(401, { error: 'missing_bearer_token' }, cors);
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json(401, { error: 'invalid_token' }, cors);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const uid = user.id;

  // Rate-limit: 3 exports per user per day. The full envelope is
  // expensive to assemble (nine table reads + an audit insert), and
  // there is no legitimate reason to call it more than a handful of
  // times even during testing.
  const verdict = await checkRateLimit(admin, {
    key: `export-user-data:${uid}`,
    max: 3,
    windowSeconds: 86_400,
  });
  if (!verdict.allowed) return rateLimitedResponse(verdict, cors);

  const [
    profile,
    publicProfile,
    articles,
    comments,
    vibes,
    follows,
    trustEvents,
    pushSubs,
    reports,
  ] = await Promise.all([
    admin.from('users').select('*').eq('uid', uid).maybeSingle(),
    admin.from('public_profiles').select('*').eq('uid', uid).maybeSingle(),
    admin.from('articles').select('*').eq('author_uid', uid),
    admin.from('article_comments').select('*').eq('author_uid', uid),
    admin.from('article_vibes').select('*').eq('user_uid', uid),
    admin.from('follows').select('*').eq('follower_uid', uid),
    admin.from('trust_events').select('*').eq('user_uid', uid),
    admin.from('push_subscriptions').select('endpoint, user_agent, created_at').eq('user_uid', uid),
    admin.from('reports').select('*').eq('reporter_uid', uid),
  ]);

  // Audit the request for compliance — we want a record of who asked
  // for their data and when.
  await admin.rpc('audit_log', {
    p_actor: uid,
    p_action: 'gdpr.export.requested',
    p_target_type: 'USER',
    p_target_id: uid,
    p_payload: {
      counts: {
        articles: articles.data?.length ?? 0,
        comments: comments.data?.length ?? 0,
        vibes: vibes.data?.length ?? 0,
        follows: follows.data?.length ?? 0,
        trustEvents: trustEvents.data?.length ?? 0,
        reports: reports.data?.length ?? 0,
      },
    },
  });

  return json(200, {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    subject: { uid, email: user.email },
    data: {
      profile: profile.data,
      publicProfile: publicProfile.data,
      articles: articles.data ?? [],
      comments: comments.data ?? [],
      vibes: vibes.data ?? [],
      follows: follows.data ?? [],
      trustEvents: trustEvents.data ?? [],
      pushSubscriptions: pushSubs.data ?? [],
      reports: reports.data ?? [],
    },
  }, cors);
});

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
