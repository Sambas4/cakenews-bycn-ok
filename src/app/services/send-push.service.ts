import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Logger } from './logger.service';

export type PushAudience =
  | { type: 'all' }
  | { type: 'user'; uid: string }
  | { type: 'role'; role: 'USER' | 'EDITOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' }
  | { type: 'follows'; author: string };

export interface PushDispatchPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  tone?: string;
}

export interface PushDispatchResult {
  ok: boolean;
  audience: number;
  web: number;
  ios: number;
  android: number;
  pruned: number;
  failed: number;
  error?: string;
}

/**
 * Client-side wrapper around the `send-push` Edge Function declared
 * in `supabase/functions/send-push/index.ts`.
 *
 * Why a dedicated service:
 *   * The Edge Function takes a {audience, payload} envelope. Spreading
 *     that shape across components would invite drift; keeping it
 *     behind a typed surface guarantees the studio UI and any future
 *     automated trigger (scheduled push, counter-brief auto-dispatch)
 *     converge on the same contract.
 *   * The function returns per-channel counters. We surface them
 *     verbatim so the composer can show "5 web · 2 iOS · 0 Android
 *     · 1 pruned" instead of a vague "Push sent".
 */
@Injectable({ providedIn: 'root' })
export class SendPushService {
  private supabase = inject(SupabaseService);
  private logger = inject(Logger);

  async dispatch(audience: PushAudience, payload: PushDispatchPayload): Promise<PushDispatchResult> {
    if (!payload.title?.trim() || !payload.body?.trim()) {
      return { ok: false, audience: 0, web: 0, ios: 0, android: 0, pruned: 0, failed: 0, error: 'missing_title_or_body' };
    }
    try {
      const { data, error } = await this.supabase.client.functions.invoke('send-push', {
        method: 'POST',
        body: { audience, payload },
      });
      if (error) throw error;
      const body = (data ?? {}) as Partial<PushDispatchResult>;
      return {
        ok: true,
        audience: body.audience ?? 0,
        web: body.web ?? 0,
        ios: body.ios ?? 0,
        android: body.android ?? 0,
        pruned: body.pruned ?? 0,
        failed: body.failed ?? 0,
      };
    } catch (e) {
      this.logger.warn('send-push dispatch failed', e);
      const message = (e instanceof Error) ? e.message : 'dispatch_failed';
      return { ok: false, audience: 0, web: 0, ios: 0, android: 0, pruned: 0, failed: 0, error: message };
    }
  }
}
