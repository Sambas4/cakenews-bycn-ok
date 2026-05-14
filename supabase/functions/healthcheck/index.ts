/**
 * Edge Function: healthcheck
 *
 * Cheap, dependency-free liveness probe. Designed to be polled every
 * 30s-1min from a status page or uptime monitor (Pingdom, UptimeRobot,
 * Better Stack, internal Prometheus blackbox-exporter…).
 *
 * Returns:
 *   * 200 + JSON `{ status: 'ok',       checks: {…} }` when both the
 *                                                       database and
 *                                                       the realtime
 *                                                       channel respond.
 *   * 503 + JSON `{ status: 'degraded', checks: {…} }` when at least
 *                                                       one component
 *                                                       fails. We
 *                                                       still return a
 *                                                       JSON body so
 *                                                       monitors can
 *                                                       diff the
 *                                                       components.
 *
 * Public endpoint — no auth required, the body never exposes anything
 * sensitive (no row counts, no tenant info, just up/down booleans).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCors, handlePreflight } from '../_shared/cors.ts';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const METHODS = ['GET', 'OPTIONS'];

interface ComponentCheck {
  ok: boolean;
  /** Optional latency in ms — useful for percentile dashboards. */
  latencyMs?: number;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, METHODS);
  if (preflight) return preflight;
  const cors = buildCors(req, METHODS);
  if (req.method !== 'GET') return json(405, { status: 'error', error: 'method_not_allowed' }, cors);

  const checks: Record<string, ComponentCheck> = {};

  // 1) Postgres reachability — count() on a public-readable table is
  // cheap and exercises the connection pool + RLS evaluation.
  const dbStarted = performance.now();
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('articles').select('id', { count: 'exact', head: true }).limit(1);
    checks['db'] = { ok: !error, latencyMs: Math.round(performance.now() - dbStarted) };
  } catch {
    checks['db'] = { ok: false, latencyMs: Math.round(performance.now() - dbStarted) };
  }

  // 2) Auth reachability — `getUser()` against the public anon key.
  // We don't include credentials so the call exercises the public
  // path the browser uses.
  const authStarted = performance.now();
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/health`);
    checks['auth'] = { ok: resp.ok, latencyMs: Math.round(performance.now() - authStarted) };
  } catch {
    checks['auth'] = { ok: false, latencyMs: Math.round(performance.now() - authStarted) };
  }

  const allOk = Object.values(checks).every(c => c.ok);
  return json(allOk ? 200 : 503, {
    status: allOk ? 'ok' : 'degraded',
    checks,
    ts: new Date().toISOString(),
  }, cors);
});

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
