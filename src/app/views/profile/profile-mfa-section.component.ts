import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MfaService, MfaEnrollment, MfaFactor } from '../../services/mfa.service';

/**
 * Self-contained MFA management surface, mounted inside the profile
 * settings tab. Three states drive the UI:
 *
 *   1. **Idle** — render the list of registered factors with an
 *      "Activer l'authentification à deux facteurs" CTA.
 *   2. **Pending** — an enrollment was just requested. Show the
 *      QR / secret + a 6-digit input until the user confirms.
 *   3. **Removing** — short confirmation step before unenroll.
 *
 * No external QR-code library is pulled in; we display the
 * `otpauth://...` URI as plain text along with the base-32 secret so
 * the user can paste either into Authy / 1Password / Google
 * Authenticator. A future bundle-light QR component can be added
 * without touching this surface.
 */
@Component({
  selector: 'app-profile-mfa-section',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <section>
      <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">
        Sécurité — Authentificateur
      </h3>

      <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <!-- Active factors -->
        @for (f of mfa.factors(); track f.id) {
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <lucide-icon name="shield-check" class="w-4 h-4 text-emerald-300"></lucide-icon>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[13.5px] font-bold text-white truncate">{{ f.friendlyName }}</span>
                <span class="text-[10.5px]" [ngClass]="f.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'">
                  {{ f.status === 'verified' ? 'Actif · TOTP' : 'À vérifier' }}
                </span>
              </div>
            </div>
            <button type="button" (click)="askRemove(f)" [disabled]="mfa.busy()"
              class="text-[10px] font-black uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors disabled:opacity-50">
              Retirer
            </button>
          </div>
        }

        <!-- Idle CTA -->
        @if (!enrollment() && !pendingRemove()) {
          <button type="button" (click)="startEnrollment()" [disabled]="mfa.busy()"
            class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left disabled:opacity-50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <lucide-icon name="key" class="w-4 h-4 text-zinc-300"></lucide-icon>
              </div>
              <div class="flex flex-col">
                <span class="text-[13.5px] font-bold text-white">
                  {{ mfa.hasVerified() ? 'Ajouter un autre authentificateur' : 'Activer l\\'authentification à deux facteurs' }}
                </span>
                <span class="text-[10.5px] text-zinc-500">
                  Recommandé pour les comptes éditeurs et administrateurs
                </span>
              </div>
            </div>
            <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600"></lucide-icon>
          </button>
        }

        <!-- Enrollment flow -->
        @if (enrollment(); as e) {
          <div class="p-4 space-y-3">
            <p class="text-[12.5px] text-zinc-300 leading-relaxed">
              Ajoute le compte à ton application d'authentification (Authy, 1Password,
              Google Authenticator…) puis saisis le code à 6 chiffres généré.
            </p>

            <div class="bg-black/40 border border-white/[0.08] rounded-xl p-3">
              <p class="text-[9.5px] font-black uppercase tracking-widest text-zinc-500 mb-1">URI otpauth</p>
              <code class="block text-[10.5px] text-emerald-300 break-all leading-snug">{{ e.uri }}</code>
            </div>
            <div class="bg-black/40 border border-white/[0.08] rounded-xl p-3">
              <p class="text-[9.5px] font-black uppercase tracking-widest text-zinc-500 mb-1">Secret</p>
              <code class="block text-[12px] tracking-widest text-white">{{ e.secret }}</code>
            </div>

            <label class="block">
              <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Code à 6 chiffres
              </span>
              <input type="text" inputmode="numeric" maxlength="6"
                [(ngModel)]="code"
                (input)="onCodeInput($event)"
                class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-center text-[18px] font-mono tracking-[0.4em] outline-none focus:border-[#7ae25c]"
                aria-label="Code à 6 chiffres" />
            </label>

            <div class="grid grid-cols-2 gap-2 pt-2">
              <button type="button" (click)="cancelEnrollment()"
                class="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10.5px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/[0.08]">
                Annuler
              </button>
              <button type="button" (click)="verifyEnrollment()"
                [disabled]="mfa.busy() || code().length !== 6"
                class="h-11 rounded-xl bg-[#7ae25c] text-black text-[10.5px] font-black uppercase tracking-widest hover:bg-[#9aef82] disabled:opacity-50">
                {{ mfa.busy() ? '…' : 'Vérifier' }}
              </button>
            </div>
          </div>
        }

        <!-- Removal confirmation -->
        @if (pendingRemove(); as f) {
          <div class="p-4">
            <p class="text-[12.5px] text-zinc-300 leading-snug mb-3">
              Retirer <span class="text-white font-bold">{{ f.friendlyName }}</span> ? Tu pourras
              te reconnecter sans code, mais ton compte ne sera plus protégé par MFA.
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" (click)="pendingRemove.set(null)"
                class="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10.5px] font-black uppercase tracking-widest text-zinc-300">
                Annuler
              </button>
              <button type="button" (click)="confirmRemove()" [disabled]="mfa.busy()"
                class="h-11 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[10.5px] font-black uppercase tracking-widest hover:bg-red-500/25 disabled:opacity-50">
                {{ mfa.busy() ? '…' : 'Retirer' }}
              </button>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class ProfileMfaSectionComponent {
  protected mfa = inject(MfaService);

  readonly enrollment = signal<MfaEnrollment | null>(null);
  readonly pendingRemove = signal<MfaFactor | null>(null);
  readonly code = signal<string>('');

  readonly disabled = computed(() => this.mfa.busy());

  /**
   * Strip non-digit characters as the user types so paste-from-1Password
   * (which often includes a space) still produces a clean 6-digit code.
   */
  onCodeInput(e: Event): void {
    const input = e.target as HTMLInputElement | null;
    if (!input) return;
    const cleaned = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (cleaned !== input.value) input.value = cleaned;
    this.code.set(cleaned);
  }

  async startEnrollment(): Promise<void> {
    const e = await this.mfa.enroll('CakeNews');
    if (e) this.enrollment.set(e);
  }

  cancelEnrollment(): void {
    const current = this.enrollment();
    if (current) {
      // The factor exists in `unverified` state on the server; clean it
      // up so we don't leave dangling rows.
      void this.mfa.unenroll(current.factorId);
    }
    this.enrollment.set(null);
    this.code.set('');
  }

  async verifyEnrollment(): Promise<void> {
    const e = this.enrollment();
    if (!e) return;
    const ok = await this.mfa.verify(e.factorId, this.code());
    if (ok) {
      this.enrollment.set(null);
      this.code.set('');
    }
  }

  askRemove(f: MfaFactor): void { this.pendingRemove.set(f); }

  async confirmRemove(): Promise<void> {
    const f = this.pendingRemove();
    if (!f) return;
    const ok = await this.mfa.unenroll(f.id);
    if (ok) this.pendingRemove.set(null);
  }
}
