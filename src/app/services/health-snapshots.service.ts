import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Logger } from './logger.service';

export type HealthStatus = 'ok' | 'degraded' | 'unknown';

export interface HealthSnapshot {
  id: number;
  recordedAt: string;
  status: HealthStatus;
  httpStatus: number | null;
  body: Record<string, unknown>;
}

interface DbRow {
  id: number;
  recorded_at: string;
  status: string;
  http_status: number | null;
  body: Record<string, unknown>;
}

const DEFAULT_LIMIT = 60;
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Client-side view of `public.health_snapshots`.
 *
 * The table is RLS-gated to staff (see migration 0006), so this
 * service is only useful from the admin shell. The history page
 * polls every minute — same cadence as the cron that writes rows —
 * but a manual `refresh()` is always honoured.
 *
 * Snapshots stay capped to the last 1440 rows server-side (~24h
 * at 1-min cadence). We fetch only the slice the UI needs so a
 * future "drill into a specific incident" view can request more
 * by passing a higher `limit`.
 */
@Injectable({ providedIn: 'root' })
export class HealthSnapshotsService {
  private supabase = inject(SupabaseService);
  private logger = inject(Logger);

  readonly snapshots = signal<HealthSnapshot[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errored = signal<boolean>(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  /** Convenient computed: most recent snapshot, or `null` if empty. */
  readonly latest = computed<HealthSnapshot | null>(() => this.snapshots()[0] ?? null);

  /** Convenient computed: percentage of `ok` rows over the window. */
  readonly uptimeRatio = computed<number>(() => {
    const rows = this.snapshots();
    if (rows.length === 0) return 0;
    const oks = rows.filter(s => s.status === 'ok').length;
    return oks / rows.length;
  });

  start(limit = DEFAULT_LIMIT): void {
    if (this.started) return;
    this.started = true;
    void this.refresh(limit);
    this.pollTimer = setInterval(() => void this.refresh(limit), REFRESH_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  stop(): void {
    this.started = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  /** Force-fetch the latest slice. Returns the new array on success. */
  async refresh(limit = DEFAULT_LIMIT): Promise<HealthSnapshot[]> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('health_snapshots')
        .select('id, recorded_at, status, http_status, body')
        .order('recorded_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 1440));
      if (error) throw error;
      const rows = ((data as DbRow[] | null) ?? []).map(this.toSnapshot);
      this.snapshots.set(rows);
      this.errored.set(false);
      return rows;
    } catch (e) {
      this.logger.warn('HealthSnapshotsService.refresh failed', e);
      this.errored.set(true);
      return this.snapshots();
    } finally {
      this.loading.set(false);
    }
  }

  // ────────────────────────────────────────────────────────────────

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.refresh();
  };

  private toSnapshot(row: DbRow): HealthSnapshot {
    const raw = row.status?.toLowerCase();
    const status: HealthStatus = raw === 'ok' || raw === 'degraded' ? raw : 'unknown';
    return {
      id: row.id,
      recordedAt: row.recorded_at,
      httpStatus: row.http_status ?? null,
      status,
      body: row.body ?? {},
    };
  }
}
