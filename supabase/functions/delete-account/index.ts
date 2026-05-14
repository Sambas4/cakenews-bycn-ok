/**
 * Edge Function: delete-account
 *
 * The Supabase JS client cannot delete an `auth.users` row — only the
 * service role can. This function gives every signed-in user a
 * single endpoint that:
 *
 *   1. Authenticates the request from the bearer token in the
 *      `Authorization` header.
 *   2. Logs the action into `admin_audit_log` for compliance.
 *   3. Deletes the auth user, which cascades into `public.users` and
 *      every owned row through the `on delete cascade` declarations
 *      in migration 0001.
 *
 * Hard-delete is preferred over soft-delete for GDPR compliance —
 * see PRIVACY.md once the privacy policy lands.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCors, handlePreflight } from '../_shared/cors.ts';

// `Deno` is available at runtime under the Supabase Edge Functions
// host. We declare the namespace here so this file type-checks in
// editors without pulling the @types/deno package.
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

  // Resolve the caller from the JWT.
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json(401, { error: 'invalid_token' }, cors);

  // Hard-delete via the service role.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Log first so the audit row survives even if the deletion below
  // partially fails.
  await admin.rpc('audit_log', {
    p_actor: user.id,
    p_action: 'self_delete_account',
    p_target_type: 'USER',
    p_target_id: user.id,
    p_payload: { email: user.email },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json(500, { error: 'delete_failed', detail: delErr.message }, cors);

  return json(200, { ok: true }, cors);
});

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
