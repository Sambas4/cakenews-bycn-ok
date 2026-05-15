import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SendPushService } from './send-push.service';
import { SupabaseService } from './supabase.service';

declare const ensureTestBed: () => void;

type Invoke = (name: string, opts: { body?: unknown; method?: string }) =>
  Promise<{ data: unknown; error: Error | null }>;

class FakeSupabaseService {
  invoke: ReturnType<typeof vi.fn> & Invoke;
  client: { functions: { invoke: Invoke } };

  constructor() {
    this.invoke = vi.fn(async () => ({
      data: { audience: 0, web: 0, ios: 0, android: 0, pruned: 0, failed: 0 },
      error: null,
    })) as unknown as ReturnType<typeof vi.fn> & Invoke;
    this.client = { functions: { invoke: this.invoke } };
  }

  /** Replace the mock with a new implementation; keeps the shape so
   *  the SendPushService keeps calling `client.functions.invoke`. */
  setImpl(fn: Invoke): void {
    this.invoke = vi.fn(fn) as unknown as ReturnType<typeof vi.fn> & Invoke;
    this.client.functions.invoke = this.invoke;
  }
}

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  const supabase = new FakeSupabaseService();
  TestBed.configureTestingModule({
    providers: [
      SendPushService,
      { provide: SupabaseService, useValue: supabase },
    ],
  });
  return { svc: TestBed.inject(SendPushService), supabase };
}

describe('SendPushService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('rejects empty title or body without hitting the Edge Function', async () => {
    const r1 = await env.svc.dispatch({ type: 'all' }, { title: '', body: 'b' });
    const r2 = await env.svc.dispatch({ type: 'all' }, { title: 't', body: '' });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(r1.error).toBe('missing_title_or_body');
    expect(env.supabase.invoke).not.toHaveBeenCalled();
  });

  it('forwards the audience + payload to send-push and surfaces counters', async () => {
    env.supabase.setImpl(async () => ({
      data: { audience: 12, web: 7, ios: 3, android: 2, pruned: 0, failed: 0 },
      error: null,
    }));

    const result = await env.svc.dispatch(
      { type: 'role', role: 'EDITOR' },
      { title: '🔥 Breaking', body: 'Une info vient de tomber.' },
    );

    expect(env.supabase.invoke).toHaveBeenCalledWith('send-push', {
      method: 'POST',
      body: {
        audience: { type: 'role', role: 'EDITOR' },
        payload: { title: '🔥 Breaking', body: 'Une info vient de tomber.' },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.audience).toBe(12);
    expect(result.web).toBe(7);
    expect(result.ios).toBe(3);
  });

  it('surfaces transport errors as ok:false with the error message', async () => {
    env.supabase.setImpl(async () => ({ data: null, error: new Error('rate_limited') }));

    const result = await env.svc.dispatch({ type: 'all' }, { title: 't', body: 'b' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('rate_limited');
  });

  it('handles a missing data body without crashing', async () => {
    env.supabase.setImpl(async () => ({ data: null, error: null }));

    const result = await env.svc.dispatch({ type: 'all' }, { title: 't', body: 'b' });
    expect(result.ok).toBe(true);
    expect(result.audience).toBe(0);
  });
});
