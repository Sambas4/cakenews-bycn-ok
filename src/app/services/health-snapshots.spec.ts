import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HealthSnapshotsService } from './health-snapshots.service';
import { SupabaseService } from './supabase.service';

declare const ensureTestBed: () => void;

interface DbRow {
  id: number;
  recorded_at: string;
  status: string;
  http_status: number | null;
  body: Record<string, unknown>;
}

/**
 * Minimal supabase-js client mock: we replay a static row set built
 * by the test and only honour the chained calls the service actually
 * makes (.from → .select → .order → .limit then await).
 */
class FakeQueryBuilder {
  constructor(private rows: DbRow[]) {}
  select(_cols: string) { return this; }
  order(_col: string, _opts: unknown) { return this; }
  limit(n: number) { this.lim = n; return this; }
  private lim: number | null = null;
  then<T>(resolve: (v: { data: DbRow[] | null; error: null }) => T) {
    const sliced = this.lim ? this.rows.slice(0, this.lim) : this.rows;
    return Promise.resolve({ data: sliced, error: null }).then(resolve);
  }
}

class FakeSupabaseService {
  rows: DbRow[] = [];
  client = { from: (_table: string) => new FakeQueryBuilder(this.rows) };
}

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  const supabase = new FakeSupabaseService();
  TestBed.configureTestingModule({
    providers: [
      HealthSnapshotsService,
      { provide: SupabaseService, useValue: supabase },
    ],
  });
  return { svc: TestBed.inject(HealthSnapshotsService), supabase };
}

function row(id: number, status: string, ago: number): DbRow {
  return {
    id,
    recorded_at: new Date(Date.now() - ago * 60_000).toISOString(),
    status,
    http_status: status === 'ok' ? 200 : 503,
    body: { status, checks: { db: { ok: status === 'ok' } } },
  };
}

describe('HealthSnapshotsService — refresh + derived state', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('starts with an empty snapshot list', () => {
    expect(env.svc.snapshots()).toEqual([]);
    expect(env.svc.latest()).toBeNull();
  });

  it('hydrates from the table on refresh()', async () => {
    env.supabase.rows = [row(3, 'ok', 0), row(2, 'ok', 1), row(1, 'degraded', 2)];
    await env.svc.refresh();
    expect(env.svc.snapshots()).toHaveLength(3);
    expect(env.svc.latest()?.id).toBe(3);
  });

  it('coerces unknown status strings to "unknown"', async () => {
    env.supabase.rows = [row(1, 'gibberish', 0)];
    await env.svc.refresh();
    expect(env.svc.snapshots()[0]?.status).toBe('unknown');
  });

  it('computes uptimeRatio over the loaded window', async () => {
    env.supabase.rows = [
      row(4, 'ok', 0),
      row(3, 'ok', 1),
      row(2, 'degraded', 2),
      row(1, 'ok', 3),
    ];
    await env.svc.refresh();
    expect(env.svc.uptimeRatio()).toBeCloseTo(0.75, 5);
  });

  it('respects the limit argument', async () => {
    env.supabase.rows = Array.from({ length: 10 }, (_, i) => row(10 - i, 'ok', i));
    await env.svc.refresh(3);
    expect(env.svc.snapshots()).toHaveLength(3);
  });
});
