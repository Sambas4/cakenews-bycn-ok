import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Logger } from './logger.service';

export type AuditTargetType = 'ARTICLE' | 'COMMENT' | 'USER';

export interface AuditEntry {
  action: string;
  targetType?: AuditTargetType;
  targetId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Client-side wrapper around the `audit_log` Postgres function declared
 * in `supabase/migrations/0003_atomic_rpc.sql`.
 *
 * The function is `security definer` and grant-restricted to the
 * service role, so calling it from the browser will fail unless the
 * operation goes through an Edge Function — which is the right
 * pattern for privileged actions. For non-privileged audit trails
 * (e.g. "user changed their bio"), the trigger-based approach is
 * preferred.
 *
 * This service still exists for two reasons:
 *  1. **Best-effort client logging** for in-app admin actions during
 *     development; failures are downgraded to warnings.
 *  2. **A single seam** so the day we move to a typed Edge Function
 *     gateway, every call site changes in one place.
 *
 * Callers MUST pass the smallest possible payload; PII never goes in.
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private logger = inject(Logger);

  async record(entry: AuditEntry): Promise<void> {
    const actor = this.auth.currentUser()?.id;
    if (!actor) return;
    try {
      await this.supabase.client.rpc('audit_log', {
        p_actor: actor,
        p_action: entry.action,
        p_target_type: entry.targetType ?? null,
        p_target_id: entry.targetId ?? null,
        p_payload: entry.payload ?? null,
      });
    } catch (e) {
      // We don't want a missing RPC (early-deployment) or an RLS denial
      // to break the calling admin flow. Log and swallow — the admin
      // gets to keep working; the missing audit row is itself logged.
      this.logger.warn('audit_log record failed', { entry, e });
    }
  }
}
