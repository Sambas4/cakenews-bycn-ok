/**
 * Shared rate-limit helper for the CakeNews Edge Functions.
 *
 * Delegates to the Postgres RPC `public.rate_limit_consume` (migration
 * 0007). The RPC runs as security-definer so a service-role client is
 * required — never call this with the anon key.
 *
 * Usage:
 *
 *     const verdict = await checkRateLimit(admin, {
 *       key: `export:${uid}`,
 *       max: 3,
 *       windowSeconds: 86_400,
 *     });
 *     if (!verdict.allowed) {
 *       return new Response(JSON.stringify({
 *         error: 'rate_limited',
 *         retryAfter: verdict.retryAfter,
 *       }), {
 *         status: 429,
 *         headers: {
 *           'Retry-After': String(verdict.retryAfter),
 *           ...cors,
 *         },
 *       });
 *     }
 *
 * If the RPC itself fails (DB down, missing function) we *fail open* and
 * return `allowed: true` with a logged warning — the goal is to throttle
 * abuse, not to take the API down when Postgres hiccups.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitOptions {
  /** Stable key, e.g. `delete:${uid}` or `push:${role}:${uid}`. */
  key: string;
  /** Maximum allowed actions inside the window. */
  max: number;
  /** Window length in seconds (fixed window, not sliding). */
  windowSeconds: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Remaining calls inside the current window (clamped at 0). */
  remaining: number;
  /** Seconds to wait before the next call would be allowed. */
  retryAfter: number;
}

interface RpcRow {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitVerdict> {
  try {
    const { data, error } = await admin.rpc('rate_limit_consume', {
      p_key: opts.key,
      p_max: opts.max,
      p_window_seconds: opts.windowSeconds,
    });
    if (error) {
      console.warn('[rate-limit] rpc error, failing open:', error.message);
      return { allowed: true, remaining: opts.max, retryAfter: 0 };
    }
    const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null;
    if (!row) {
      return { allowed: true, remaining: opts.max, retryAfter: 0 };
    }
    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfter: row.retry_after_seconds,
    };
  } catch (err) {
    console.warn('[rate-limit] unexpected error, failing open:', err);
    return { allowed: true, remaining: opts.max, retryAfter: 0 };
  }
}

export function rateLimitedResponse(
  verdict: RateLimitVerdict,
  cors: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: 'rate_limited', retryAfter: verdict.retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(verdict.retryAfter),
        ...cors,
      },
    },
  );
}
