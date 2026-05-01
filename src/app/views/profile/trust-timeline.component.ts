import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TrustService } from '../../services/trust.service';

const ICON_BY_DELTA = (d: number) => d >= 0 ? 'arrow-up' : 'arrow-down';

/**
 * Transparent timeline of the trust ledger. Shows the score, the tier
 * and the last events that shaped it. Inline so it lives at the bottom
 * of the Activity tab — no modal, no hidden surface.
 */
@Component({
  selector: 'app-trust-timeline',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5">
      <header class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <lucide-icon name="shield" class="w-4 h-4 text-emerald-300"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Trust ledger</h3>
        </div>
        <span class="text-[10px] font-black uppercase tracking-widest text-emerald-300">
          {{ tier() }} · {{ score() }}
        </span>
      </header>

      <!-- Score bar -->
      <div class="relative w-full h-2 rounded-full bg-white/[0.05] overflow-hidden mb-4">
        <div class="absolute left-0 top-0 h-full transition-all duration-500"
          [style.width.%]="(score() / 200) * 100"
          [style.background]="'linear-gradient(90deg, #f59e0b 0%, #38bdf8 50%, #7ae25c 100%)'"></div>
      </div>

      @if (events().length === 0) {
        <p class="text-[12.5px] text-zinc-400 leading-snug">
          Aucun événement encore. Lis, signale, commente : chaque action
          documente publiquement comment ton score évolue.
        </p>
      } @else {
        <ul class="space-y-2">
          @for (ev of events(); track ev.id) {
            <li class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                [ngClass]="ev.delta >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'">
                <lucide-icon [name]="iconFor(ev.delta)" class="w-3.5 h-3.5"></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-bold text-white leading-tight">{{ ev.reason }}</p>
                <p class="text-[10.5px] text-zinc-500">{{ formatAge(ev.at) }}</p>
              </div>
              <span class="font-mono tabular-nums text-[12px] font-black"
                [ngClass]="ev.delta >= 0 ? 'text-emerald-300' : 'text-red-300'">
                {{ ev.delta >= 0 ? '+' : '' }}{{ ev.delta }}
              </span>
            </li>
          }
        </ul>
      }
    </section>
  `
})
export class TrustTimelineComponent {
  private trust = inject(TrustService);

  events = this.trust.events;
  score = this.trust.score;
  tier = this.trust.tier;

  iconFor(delta: number): string {
    return ICON_BY_DELTA(delta);
  }

  formatAge(ts: number): string {
    const diffMs = Date.now() - ts;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'à l\'instant';
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `il y a ${d} j`;
    return new Date(ts).toLocaleDateString();
  }
}
