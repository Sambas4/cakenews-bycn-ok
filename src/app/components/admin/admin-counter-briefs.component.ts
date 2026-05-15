import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  CounterBriefService,
  CounterBriefCandidate,
  CounterBriefStatus,
} from '../../services/counter-brief.service';

const STATUS_META: Record<CounterBriefStatus, { label: string; chipClass: string }> = {
  NEW:       { label: 'À trier',     chipClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  TRIAGED:   { label: 'Trié',        chipClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  ASSIGNED:  { label: 'Assigné',     chipClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  PUBLISHED: { label: 'Publié',      chipClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  DISMISSED: { label: 'Écarté',      chipClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
};

/**
 * Studio inbox for Counter-Brief candidates.
 *
 * Each row is a piece of content where the community has been
 * massively sceptical (≥ 45% "Sceptique" votes over a statistical
 * floor) — the editorial team can triage, assign or dismiss.
 *
 * Pure presentation; the {@link CounterBriefService} owns the data
 * shape and persistence. The UI never mutates state directly — it
 * delegates through `setStatus(...)` so a future Supabase sync can
 * intercept those calls without touching the template.
 */
@Component({
  selector: 'app-admin-counter-briefs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="p-4">
      <header class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <lucide-icon name="radio" class="w-4 h-4 text-amber-400"></lucide-icon>
          <h2 class="text-[14px] font-[1000] tracking-tight">Counter-Brief inbox</h2>
        </div>
        <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black"
          [ngClass]="newCount() > 0 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60'">
          {{ newCount() }}
        </span>
      </header>

      @if (candidates().length === 0) {
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
          <lucide-icon name="check-circle" class="w-7 h-7 mx-auto text-emerald-300 mb-3"></lucide-icon>
          <p class="text-[13px] font-bold text-white">Aucun signal en attente</p>
          <p class="text-[11.5px] text-zinc-500 mt-1 leading-snug">
            Quand la communauté demande un angle, on te le pousse ici en temps réel.
          </p>
        </div>
      } @else {
        <ul class="space-y-2">
          @for (c of candidates(); track c.id) {
            <li class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span class="text-[14px] font-black text-amber-300">{{ c.scepticPercent }}%</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {{ c.sourceCategory }}
                    </span>
                    <span class="inline-flex items-center text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                      [ngClass]="status(c.status).chipClass">
                      {{ status(c.status).label }}
                    </span>
                    <span class="text-[10px] text-zinc-500 tabular-nums">
                      · {{ c.totalVibes }} votes
                    </span>
                  </div>
                  <h3 class="text-[13px] font-bold text-white leading-tight line-clamp-2">{{ c.sourceTitle }}</h3>
                  <p class="text-[10.5px] text-zinc-500 mt-1">Détecté {{ formatAge(c.detectedAt) }}</p>
                </div>
              </div>

              <!-- Action row -->
              <div class="mt-3 grid grid-cols-4 gap-2">
                @for (a of actions; track a.status) {
                  <button type="button" (click)="setStatus(c, a.status)"
                    class="text-[9.5px] font-black uppercase tracking-widest py-2 rounded-xl transition-all border"
                    [ngClass]="c.status === a.status
                      ? 'bg-white text-black border-white shadow'
                      : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:text-white hover:border-white/20'">
                    {{ a.label }}
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class AdminCounterBriefsComponent {
  private cb = inject(CounterBriefService);

  candidates = this.cb.candidates;
  newCount = this.cb.newCount;

  readonly actions: { status: CounterBriefStatus; label: string }[] = [
    { status: 'TRIAGED',   label: 'Trier' },
    { status: 'ASSIGNED',  label: 'Assigner' },
    { status: 'PUBLISHED', label: 'Publié' },
    { status: 'DISMISSED', label: 'Écarter' },
  ];

  status(s: CounterBriefStatus) { return STATUS_META[s]; }

  setStatus(c: CounterBriefCandidate, status: CounterBriefStatus) {
    this.cb.setStatus(c.id, status);
  }

  formatAge(ts: number): string {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'à l\'instant';
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
  }
}
