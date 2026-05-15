/**
 * Shared CORS helper for the CakeNews Edge Functions.
 *
 * Lock policy:
 *   * Production deployments MUST set `ALLOWED_ORIGINS` to a comma-
 *     separated list of fully-qualified origins (no trailing slash).
 *     Examples: `https://cakenews.app,https://staging.cakenews.app`.
 *   * If the env var is unset we fall back to `*` and emit a warning
 *     to the function log on each invocation — convenient for local
 *     `supabase functions serve` and never silently allowed in prod.
 *
 * The exported {@link buildCors} consumes the incoming `Origin`
 * header and echoes it back when it's on the allowlist; this is the
 * shape modern browsers require for credentialed requests (and the
 * one most CDNs cache best). Unknown origins receive a `null` value
 * which makes preflight fail cleanly.
 */

declare const Deno: {
  env: { get: (key: string) => string | undefined };
};

const ALLOWED_RAW = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOWED_LIST: string[] = ALLOWED_RAW
  .split(',')
  .map(s => s.trim())
  .filter(s => s.length > 0);

const WILDCARD_FALLBACK = ALLOWED_LIST.length === 0;

if (WILDCARD_FALLBACK) {
  console.warn('[cors] ALLOWED_ORIGINS not set — falling back to "*". Set the secret before going to production.');
}

/**
 * Build a fresh CORS header bag for an incoming request. Pass the
 * `Allow-Methods` you actually accept so each function declares its
 * own surface (GET vs POST + OPTIONS, etc.).
 */
export function buildCors(req: Request, methods: string[]): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  let allow = 'null';

  if (WILDCARD_FALLBACK) {
    allow = '*';
  } else if (origin && ALLOWED_LIST.includes(origin)) {
    allow = origin;
  }

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Vary': 'Origin',
  };
}

/** Short-circuit preflight requests with a 204. */
export function handlePreflight(req: Request, methods: string[]): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: buildCors(req, methods) });
}
