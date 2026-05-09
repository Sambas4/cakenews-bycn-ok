import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { Logger } from '../services/logger.service';

const DISMISS_KEY = 'cake_email_verify_dismissed_at';
const REPROMPT_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Subtle ribbon shown at the top of authenticated routes when the
 * Supabase user has signed up but never confirmed their email.
 *
 * Design:
 *   * Single line, dismissable with a 24-hour cooldown so we don't
 *     nag every visit but the user is reminded daily.
 *   * Action button re-sends the verification email through
 *     `auth.resend`. Confirmation toast and short rate-limit delay
 *     keep the flow honest.
 *   * Hidden entirely when the email is already confirmed or when
 *     no user is signed in.
 */
@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible()) {
      <div role="status"
        class="px-3 pt-2">
        <div class="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-500/12 border border-amber-500/30 text-amber-100 backdrop-blur-md">
          <lucide-icon name="mail" class="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true"></lucide-icon>
          <div class="flex-1 min-w-0">
            <p class="text-[12px] font-semibold leading-tight truncate">
              Confirme ton adresse e-mail pour sécuriser ton compte.
            </p>
            <p class="text-[10.5px] text-amber-200/80 leading-snug">
              Un lien a été envoyé à {{ email() }}. Pas reçu ?
            </p>
          </div>
          <button type="button" (click)="resend()" [disabled]="busy()"
            class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 transition-colors disabled:opacity-50">
            {{ busy() ? '…' : 'Renvoyer' }}
          </button>
          <button type="button" (click)="dismiss()" aria-label="Masquer pour 24 heures"
            class="w-7 h-7 flex items-center justify-center text-amber-200/70 hover:text-amber-100 rounded-full hover:bg-amber-500/20 transition-colors">
            <lucide-icon name="x" class="w-3.5 h-3.5" aria-hidden="true"></lucide-icon>
          </button>
        </div>
      </div>
    }
  `,
})
export class EmailVerificationBannerComponent {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);
  private logger = inject(Logger);

  readonly busy = signal(false);
  private readonly dismissedAt = signal<number>(this.loadDismiss());

  readonly email = computed(() => this.auth.currentUser()?.email ?? '');

  readonly visible = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return false;
    if (user.email_confirmed_at) return false;
    if (!user.email) return false;
    return Date.now() - this.dismissedAt() > REPROMPT_AFTER_MS;
  });

  async resend(): Promise<void> {
    const email = this.email();
    if (!email || this.busy()) return;
    this.busy.set(true);
    try {
      const { error } = await this.supabase.client.auth.resend({ type: 'signup', email });
      if (error) throw error;
      this.toast.showToast('E-mail de vérification renvoyé', 'success');
      this.dismiss();
    } catch (e) {
      this.logger.warn('email resend failed', e);
      this.toast.showToast('Réessaie dans un instant', 'warning');
    } finally {
      this.busy.set(false);
    }
  }

  dismiss(): void {
    const now = Date.now();
    this.dismissedAt.set(now);
    try { localStorage.setItem(DISMISS_KEY, String(now)); } catch { /* ignore */ }
  }

  private loadDismiss(): number {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch { return 0; }
  }
}
