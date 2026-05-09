import { Injectable, inject } from '@angular/core';
import { Logger } from './logger.service';

export interface MonitoringEvent {
  /** Free-form short identifier — e.g. `auth.signin` or `feed.pivot`. */
  name: string;
  /** Bounded contextual payload. Avoid PII; the schema is up to the caller. */
  data?: Record<string, unknown>;
  /** Severity used downstream by the sink. Defaults to `info`. */
  level?: 'debug' | 'info' | 'warning' | 'error';
}

export interface MonitoringSink {
  capture: (event: MonitoringEvent) => void;
  /** Sentry-style breadcrumb attached to the next captured event. */
  breadcrumb?: (event: MonitoringEvent) => void;
}

declare global {
  interface Window {
    __cakeMonitoringSink?: MonitoringSink;
    /** @deprecated kept for backwards compat with the Logger hook. */
    __cakeErrorSink?: (payload: unknown) => void;
  }
}

/**
 * Single ingress point for analytics + error reporting.
 *
 * The actual sink (Sentry / PostHog / Datadog / homegrown) is set by
 * the host page on `window.__cakeMonitoringSink`. The service stays
 * dependency-free so adding a new SDK is a deployment concern, not a
 * code change.
 *
 * In dev, when no sink is wired, events flow through {@link Logger}
 * with the matching severity and are filtered as usual.
 */
@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private logger = inject(Logger);

  /** Drop a breadcrumb that the next captured event should include. */
  breadcrumb(event: MonitoringEvent): void {
    const sink = window.__cakeMonitoringSink;
    if (sink?.breadcrumb) {
      try { sink.breadcrumb(event); return; }
      catch (e) { this.logger.warn('monitoring breadcrumb sink threw', e); }
    }
    if (event.level === 'error') this.logger.warn('[breadcrumb]', event.name, event.data ?? '');
    else this.logger.debug('[breadcrumb]', event.name, event.data ?? '');
  }

  /** Capture a discrete event (analytics) or an error. */
  capture(event: MonitoringEvent): void {
    const sink = window.__cakeMonitoringSink;
    if (sink) {
      try { sink.capture(event); return; }
      catch (e) { this.logger.warn('monitoring sink threw', e); }
    }
    // No sink wired — still surface in the console at the right level.
    switch (event.level) {
      case 'error':   this.logger.error(event.name, event.data); break;
      case 'warning': this.logger.warn(event.name, event.data); break;
      case 'info':    this.logger.info(event.name, event.data); break;
      default:        this.logger.debug(event.name, event.data); break;
    }
  }

  /** Convenience wrapper for caught exceptions. */
  captureError(name: string, err: unknown, data?: Record<string, unknown>): void {
    this.capture({ name, level: 'error', data: { ...data, error: this.normaliseError(err) } });
  }

  private normaliseError(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
      return { message: err.message, stack: err.stack, name: err.name };
    }
    return { value: String(err) };
  }
}
