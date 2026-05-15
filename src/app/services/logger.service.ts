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
    // Modern path: structured monitoring sink (Sentry / Datadog / …).
    // The MonitoringService writes to `window.__cakeMonitoringSink`;
    // calling it directly from here avoids a circular DI (the Logger
    // is injected into MonitoringService).
    const monitoringSink = (window as { __cakeMonitoringSink?: { capture: (e: unknown) => void } }).__cakeMonitoringSink;
    if (monitoringSink?.capture) {
      try {
        monitoringSink.capture({
          name: message,
          level: 'error',
          data: { ...(extra ?? {}), error: normaliseError(err) },
        });
      } catch { /* sink failure must never break the caller */ }
    }
    // Legacy hook kept for backwards compatibility with hand-rolled
    // sinks that may already be installed on the page.
    const legacy = (window as { __cakeErrorSink?: (p: unknown) => void }).__cakeErrorSink;
    if (typeof legacy === 'function') {
      try { legacy({ message, err, extra, ts: Date.now() }); } catch { /* ignore */ }
    }
  }
}

function normaliseError(err: unknown): Record<string, unknown> | undefined {
  if (err == null) return undefined;
  if (err instanceof Error) return { message: err.message, stack: err.stack, name: err.name };
  if (typeof err === 'string') return { value: err };
  if (typeof err === 'object') return err as Record<string, unknown>;
  return { value: String(err) };
}
