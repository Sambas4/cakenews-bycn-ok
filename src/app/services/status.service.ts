import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Logger } from './logger.service';

export type SystemStatus = 'ok' | 'degraded' | 'unknown';

export interface ComponentCheck {
  ok: boolean;
  latencyMs?: number;
}

export interface HealthSnapshot {
  status: SystemStatus;
  checks: Record<string, ComponentCheck>;
  fetchedAt: number;
}

const POLL_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 5 * 60_000;

/**
 * Polls the {@link healthcheck Edge Function} on a slow timer (60s
 * default) so the admin shell can render an at-a-glance status badge.
 *
 * Why a service rather than an HTTP call from the badge component:
 *   * One service polls — every consumer reads the same signal. No
 *     N components hitting the endpoint simultaneously.
 *   * Visibility-aware: when the tab is hidden we pause the timer to
 *     avoid waking the device for nothing.
 *   * Auto-degrades to `unknown` when the snapshot becomes stale, so
 *     the UI never claims everything is fine on a frozen poll.
 */
@Injectable({ providedIn: 'root' })
export class StatusService {
  private supabase = inject(SupabaseService);
  private logger = inject(Logger);

  private readonly snapshot = signal<HealthSnapshot | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  /** Resolved status, with staleness guard. */
  readonly status = computed<SystemStatus>(() => {
    const s = this.snapshot();
    if (!s) return 'unknown';
    if (Date.now() - s.fetchedAt > STALE_AFTER_MS) return 'unknown';
    return s.status;
  });

  readonly snapshotSignal = this.snapshot.asReadonly();

  /** Idempotent — call from the admin shell when it mounts. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.pollOnce();
    this.timer = setInterval(() => void this.pollOnce(), POLL_INTERVAL_MS);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  /** Force-refresh on demand (UI button, post-deploy bump). */
  async refresh(): Promise<HealthSnapshot | null> {
    return this.pollOnce();
  }

  // ─────────────────────────────────────────────────────────────

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.pollOnce();
  };

  private async pollOnce(): Promise<HealthSnapshot | null> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke('healthcheck', {
        method: 'GET',
      });
      if (error) throw error;
      const body = data as { status?: SystemStatus; checks?: Record<string, ComponentCheck> };
      const snap: HealthSnapshot = {
        status: (body.status ?? 'unknown'),
        checks: body.checks ?? {},
        fetchedAt: Date.now(),
      };
      this.snapshot.set(snap);
      return snap;
    } catch (e) {
      this.logger.warn('healthcheck poll failed', e);
      return null;
    }
  }
}
