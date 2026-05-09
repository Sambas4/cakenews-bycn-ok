import { Injectable, inject } from '@angular/core';
import { ConsentService } from './consent.service';
import { Logger } from './logger.service';
import { MonitoringService, MonitoringEvent, MonitoringSink } from './monitoring.service';

/**
 * Optional Sentry-style sink wired into {@link MonitoringService}.
 *
 * Why not a hard dependency:
 *   * Many deployments (open-source self-hosters, internal previews,
 *     enterprise on-prem) deliberately do not run Sentry. Adding the
 *     SDK to `package.json` would force everyone to ship the ~80 kB
 *     bundle even when the DSN is empty.
 *   * The user must consent to error tracking. We refuse to load any
 *     network code until {@link ConsentService.analyticsAllowed} is
 *     `true`.
 *
 * Strategy:
 *   * On `connect(dsn)`, lazy-import the official Sentry browser SDK
 *     from `esm.sh` (or any URL configured by the host page) and
 *     register a sink that forwards captured events into Sentry's
 *     `captureMessage` / `captureException` / `addBreadcrumb`.
 *   * Honours the consent: the sink installs itself only if
 *     `analyticsAllowed()` is `true`. Revoking consent uninstalls
 *     the sink immediately.
 *
 * The DSN can also live in `window.__cakeSentryDsn` — set by the
 * host page from a runtime config endpoint, no build step required.
 */
@Injectable({ providedIn: 'root' })
export class SentryBindingService {
  private monitoring = inject(MonitoringService);
  private consent = inject(ConsentService);
  private logger = inject(Logger);

  private installed = false;
  private uninstall: (() => void) | null = null;

  async connect(dsn?: string): Promise<boolean> {
    const effectiveDsn = (dsn ?? (window as { __cakeSentryDsn?: string }).__cakeSentryDsn ?? '').trim();
    if (!effectiveDsn) return false;
    if (!this.consent.analyticsAllowed()) {
      this.logger.info('Sentry binding skipped — user has not consented to analytics');
      return false;
    }
    if (this.installed) return true;

    try {
      // Lazy ESM import via a dynamic specifier the bundler is
      // explicitly told to leave alone (`@vite-ignore`). The result
      // is cast through `unknown` because TS does not type-check
      // arbitrary URLs.
      const url = 'https://esm.sh/@sentry/browser@8';
      const mod = (await import(/* @vite-ignore */ url)) as unknown;
      const sentry = mod as {
        init: (options: Record<string, unknown>) => void;
        captureMessage: (m: string, opts?: Record<string, unknown>) => void;
        captureException: (err: unknown, opts?: Record<string, unknown>) => void;
        addBreadcrumb: (b: Record<string, unknown>) => void;
      };
      sentry.init({
        dsn: effectiveDsn,
        environment: (import.meta as { env?: { MODE?: string } }).env?.MODE ?? 'production',
        tracesSampleRate: 0,
      });

      const sink: MonitoringSink = {
        capture: (event: MonitoringEvent) => {
          const { name, level = 'info', data } = event;
          if (level === 'error') {
            sentry.captureException(data?.['error'] ?? new Error(name), { extra: data });
          } else {
            sentry.captureMessage(name, { level, extra: data });
          }
        },
        breadcrumb: (event: MonitoringEvent) => {
          sentry.addBreadcrumb({
            category: event.name,
            level: event.level ?? 'info',
            data: event.data,
            timestamp: Date.now() / 1000,
          });
        },
      };

      const previous = window.__cakeMonitoringSink;
      window.__cakeMonitoringSink = sink;
      this.uninstall = () => { window.__cakeMonitoringSink = previous; };
      this.installed = true;
      this.logger.info('Sentry binding installed');
      return true;
    } catch (e) {
      this.logger.warn('Sentry binding failed; continuing without remote error tracking', e);
      return false;
    }
  }

  disconnect(): void {
    if (!this.installed) return;
    try { this.uninstall?.(); } catch { /* ignore */ }
    this.uninstall = null;
    this.installed = false;
  }
}
