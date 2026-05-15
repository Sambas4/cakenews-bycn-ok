import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { Logger } from './logger.service';
import { ToastService } from './toast.service';

export interface MfaFactor {
  id: string;
  friendlyName: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
  createdAt?: string;
}

export interface MfaEnrollment {
  factorId: string;
  /** `otpauth://...` URI to encode as a QR for authenticator apps. */
  uri: string;
  /** Base-32 secret string for users who can't scan the QR. */
  secret: string;
}

/**
 * Wraps Supabase's `auth.mfa.*` API to give the rest of the app a tiny,
 * typed surface and a reactive `factors` signal the profile UI can
 * read directly.
 *
 * Lifecycle:
 *   * On user change → refresh the factor list. Logged-out users see
 *     an empty list.
 *   * `enroll(name)` → returns the QR + secret to display once.
 *   * `verify(factorId, code)` → activates the factor; afterwards
 *     Supabase will challenge on every login.
 *   * `unenroll(factorId)` → deletes the factor.
 *
 * Every state-changing action is audit-logged.
 */
@Injectable({ providedIn: 'root' })
export class MfaService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private audit = inject(AuditLogService);
  private logger = inject(Logger);
  private toast = inject(ToastService);

  readonly factors = signal<MfaFactor[]>([]);
  readonly busy = signal(false);

  readonly hasVerified = computed(() => this.factors().some(f => f.status === 'verified'));

  constructor() {
    // Refresh the factor list on auth state changes.
    effect(() => {
      const user = this.auth.currentUser();
      if (!user) { this.factors.set([]); return; }
      void this.refresh();
    });
  }

  async refresh(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client.auth.mfa.listFactors();
      if (error) throw error;
      const list = (data?.totp ?? []).map((f): MfaFactor => ({
        id: f.id,
        friendlyName: (f as { friendly_name?: string }).friendly_name ?? 'Authenticator',
        factorType: 'totp',
        status: f.status as MfaFactor['status'],
        createdAt: (f as { created_at?: string }).created_at,
      }));
      this.factors.set(list);
    } catch (e) {
      this.logger.warn('mfa.listFactors failed', e);
    }
  }

  /**
   * Enroll a new TOTP factor. The returned URI / secret should be
   * displayed exactly once — Supabase does not expose it again.
   */
  async enroll(friendlyName: string): Promise<MfaEnrollment | null> {
    if (this.busy()) return null;
    this.busy.set(true);
    try {
      const { data, error } = await this.supabase.client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      });
      if (error) throw error;
      const enrollment: MfaEnrollment = {
        factorId: data.id,
        uri: data.totp.uri,
        secret: data.totp.secret,
      };
      await this.refresh();
      void this.audit.record({ action: 'mfa.enroll.requested', payload: { factorId: enrollment.factorId } });
      return enrollment;
    } catch (e) {
      this.logger.error('mfa.enroll', e);
      this.toast.showToast("Impossible d'initialiser l'authentificateur", 'error');
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Verify the 6-digit code produced by the authenticator. Required
   * exactly once per enrollment to flip the factor from `unverified`
   * to `verified`.
   */
  async verify(factorId: string, code: string): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      const { data: challenge, error: chErr } = await this.supabase.client.auth.mfa.challenge({ factorId });
      if (chErr || !challenge) throw chErr;
      const { error: vErr } = await this.supabase.client.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      await this.refresh();
      void this.audit.record({ action: 'mfa.enroll.verified', payload: { factorId } });
      this.toast.showToast('Authentificateur activé', 'success');
      return true;
    } catch (e) {
      this.logger.warn('mfa.verify failed', e);
      this.toast.showToast('Code incorrect ou expiré', 'error');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async unenroll(factorId: string): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      const { error } = await this.supabase.client.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await this.refresh();
      void this.audit.record({ action: 'mfa.unenroll', payload: { factorId } });
      this.toast.showToast('Authentificateur retiré', 'success');
      return true;
    } catch (e) {
      this.logger.error('mfa.unenroll', e);
      this.toast.showToast("Échec de la désinscription MFA", 'error');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
