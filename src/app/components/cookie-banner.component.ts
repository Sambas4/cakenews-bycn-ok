import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ConsentService } from '../services/consent.service';

/**
 * GDPR-aligned consent banner.
 *
 * Shown only when {@link ConsentService.needsDecision} is `true`.
 * Two equally weighted choices — we don't dark-pattern by making
 * "Accepter" larger than "Refuser". Both buttons advance the state
 * machine in one tap.
 *
 * Visually anchored above the bottom navigation. Tailwind utility
 * classes only — no card design changes elsewhere.
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (consent.needsDecision()) {
      <div role="dialog"
        aria-labelledby="cake-consent-title"
        aria-describedby="cake-consent-body"
        class="pointer-events-auto fixed left-0 right-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[1200] flex justify-center px-3">
        <div class="max-w-[460px] w-full bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-4 animate-[slideUp_0.25s_ease-out]">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <lucide-icon name="shield" class="w-4 h-4 text-emerald-300"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h2 id="cake-consent-title" class="text-[13px] font-black text-white leading-tight">
                Confidentialité
              </h2>
              <p id="cake-consent-body" class="text-[11.5px] text-zinc-400 leading-snug mt-1">
                Nous collectons uniquement les données nécessaires au fonctionnement de l’app.
                Tu peux accepter le suivi anonyme des erreurs pour nous aider à corriger les bugs,
                ou refuser — l’expérience reste identique.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button type="button" (click)="consent.reject()"
              class="h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10.5px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/[0.08] active:scale-[0.98] transition-all">
              Refuser
            </button>
            <button type="button" (click)="consent.accept()"
              class="h-10 rounded-xl bg-[#7ae25c] text-black text-[10.5px] font-black uppercase tracking-widest hover:bg-[#9aef82] active:scale-[0.98] transition-all">
              Accepter
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieBannerComponent {
  protected consent = inject(ConsentService);
}
