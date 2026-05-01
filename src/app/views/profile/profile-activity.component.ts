import { Component, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../../services/interaction.service';
import { DataService } from '../../services/data.service';
import { CATEGORY_COLORS } from '../../constants';
import type { Article, Category } from '../../types';
import { Router } from '@angular/router';

interface AdnSlice {
  cat: string;
  pct: number;
  color: string;
}

/**
 * Profile activity tab — surface the user's reading DNA, recent reads,
 * saved bookmarks and a heat-stripe of session intensity.
 */
@Component({
  selector: 'app-profile-activity',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-[slideUp_0.25s_ease-out]">

      <!-- ADN Reader -->
      <section class="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5 relative overflow-hidden">
        <div aria-hidden="true" class="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#7ae25c]/10 blur-3xl"></div>

        <header class="flex items-center justify-between mb-4 relative">
          <div class="flex items-center gap-2">
            <lucide-icon name="pie-chart" class="w-4 h-4 text-[#7ae25c]"></lucide-icon>
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[#7ae25c]">Ton ADN Lecteur</h3>
          </div>
          <span class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            {{ totalSignals() }} signaux
          </span>
        </header>

        @if (slices().length === 0) {
          <p class="text-[13px] text-zinc-400 leading-relaxed relative">
            Lis quelques articles pour révéler ton ADN. L'algorithme apprendra ce qui te fait vibrer en quelques minutes.
          </p>
        } @else {
          <!-- Stacked horizontal bar -->
          <div class="relative w-full h-3 rounded-full bg-white/[0.04] overflow-hidden flex">
            @for (s of slices(); track s.cat) {
              <div [style.width.%]="s.pct" [style.backgroundColor]="s.color" class="h-full"></div>
            }
          </div>

          <ul class="mt-4 space-y-2 relative">
            @for (s of slices(); track s.cat) {
              <li class="flex items-center justify-between text-[12px]">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.backgroundColor]="s.color"></span>
                  <span class="font-bold text-white truncate">{{ s.cat }}</span>
                </div>
                <span class="font-mono text-zinc-400 tabular-nums shrink-0">{{ s.pct }}%</span>
              </li>
            }
          </ul>

          <p class="mt-4 pt-4 border-t border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 relative">
            <lucide-icon name="clock" class="w-3 h-3"></lucide-icon>
            Format préféré : <span class="text-zinc-300">{{ formatPref() }}</span>
          </p>
        }
      </section>

      <!-- Library -->
      <section>
        <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">
          Bibliothèque
        </h3>

        <div class="space-y-2">
          <button (click)="openSaved.emit()" type="button"
            class="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] active:scale-[0.99] transition-all">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center">
                <lucide-icon name="bookmark" class="w-4 h-4 text-[#38bdf8]"></lucide-icon>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-[13px] font-black uppercase tracking-wider text-white">Sauvegardés</span>
                <span class="text-[10px] text-zinc-500">{{ savedCount() }} article(s)</span>
              </div>
            </div>
            <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600"></lucide-icon>
          </button>

          <button (click)="openHistory.emit()" type="button"
            class="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] active:scale-[0.99] transition-all">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <lucide-icon name="history" class="w-4 h-4 text-violet-300"></lucide-icon>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-[13px] font-black uppercase tracking-wider text-white">Historique</span>
                <span class="text-[10px] text-zinc-500">{{ readCount() }} lecture(s)</span>
              </div>
            </div>
            <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600"></lucide-icon>
          </button>

          <button (click)="openLikes.emit()" type="button"
            class="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] active:scale-[0.99] transition-all">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <lucide-icon name="heart" class="w-4 h-4 text-rose-400"></lucide-icon>
              </div>
              <div class="flex flex-col items-start">
                <span class="text-[13px] font-black uppercase tracking-wider text-white">Likés</span>
                <span class="text-[10px] text-zinc-500">{{ likedCount() }} article(s)</span>
              </div>
            </div>
            <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600"></lucide-icon>
          </button>
        </div>
      </section>

      <!-- Recent reads strip -->
      @if (recentArticles().length > 0) {
        <section>
          <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">
            Reprends ta lecture
          </h3>
          <div class="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-2">
            @for (article of recentArticles(); track article.id) {
              <button (click)="openArticle(article.id)" type="button"
                class="shrink-0 w-[140px] rounded-2xl overflow-hidden border border-white/[0.06] bg-zinc-900/40 hover:border-white/15 transition-colors active:scale-[0.98]">
                <div class="aspect-[4/3] bg-zinc-900 relative">
                  <img [src]="article.imageUrl" alt="" referrerpolicy="no-referrer" loading="lazy" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <span class="absolute bottom-2 left-2 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white text-black">
                    {{ article.category }}
                  </span>
                </div>
                <p class="text-[11px] font-bold text-white leading-tight p-2.5 line-clamp-2 text-left">
                  {{ article.title }}
                </p>
              </button>
            }
          </div>
        </section>
      }

    </div>
  `
})
export class ProfileActivityComponent {
  openSaved = output<void>();
  openHistory = output<void>();
  openLikes = output<void>();

  private interaction = inject(InteractionService);
  private dataService = inject(DataService);
  private router = inject(Router);

  savedCount = computed(() => this.interaction.savedArticles().length);
  readCount = computed(() => this.interaction.readArticles().length);
  likedCount = computed(() => this.interaction.likedArticles().length);

  totalSignals = computed(() =>
    this.interaction.likedArticles().length
    + this.interaction.savedArticles().length
    + this.interaction.commentedArticles().length
    + this.interaction.readArticles().length
  );

  slices = computed<AdnSlice[]>(() => {
    const sessions = this.interaction.sessionHistory();
    if (sessions.length === 0) return [];
    const counts = new Map<string, number>();
    for (const s of sessions) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = sorted.reduce((acc, [, n]) => acc + n, 0) || 1;
    return sorted.map(([cat, n]) => ({
      cat,
      pct: Math.round((n / total) * 100),
      color: CATEGORY_COLORS[cat as Category] ?? '#7ae25c',
    }));
  });

  formatPref = computed(() => {
    const sessions = this.interaction.sessionHistory();
    if (sessions.length === 0) return 'à découvrir';
    const avg = sessions.reduce((acc, s) => acc + s.durationMs, 0) / sessions.length;
    if (avg > 120_000) return 'longs et détaillés';
    if (avg > 30_000) return 'mid-form';
    return 'courts et rapides';
  });

  recentArticles = computed<Article[]>(() => {
    const reads = this.interaction.readArticles();
    if (reads.length === 0) return [];
    const recent = reads.slice(-10).reverse();
    const all = this.dataService.articles();
    const byId = new Map(all.map(a => [a.id, a]));
    return recent.map(id => byId.get(id)).filter((a): a is Article => Boolean(a)).slice(0, 8);
  });

  openArticle(id: string) {
    void this.router.navigate(['/article', id]);
  }
}
