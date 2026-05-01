import { Injectable } from '@angular/core';

const isProd = (() => {
  try {
    return (import.meta as any)?.env?.MODE === 'production';
  } catch {
    return false;
  }
})();

/**
 * Tiny structured logger. In production, only `warn`/`error` reach the
 * console and `error` may be forwarded to an external sink (Sentry, etc.).
 * In development everything is verbose. Avoid scattering raw `console.*`
 * across the codebase — go through this service instead.
 */
@Injectable({ providedIn: 'root' })
export class Logger {
  debug(...args: unknown[]) {
    if (!isProd) console.debug('[cake]', ...args);
  }

  info(...args: unknown[]) {
    if (!isProd) console.info('[cake]', ...args);
  }

  warn(...args: unknown[]) {
    console.warn('[cake]', ...args);
  }

  error(message: string, err?: unknown, extra?: Record<string, unknown>) {
    console.error('[cake]', message, err ?? '', extra ?? '');
    // External error reporting hook — wire your Sentry/Datadog SDK here.
    const sink = (window as any).__cakeErrorSink;
    if (typeof sink === 'function') {
      try { sink({ message, err, extra, ts: Date.now() }); } catch { /* ignore sink failure */ }
    }
  }
}
