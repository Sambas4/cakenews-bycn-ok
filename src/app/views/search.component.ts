import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';

import { DataService } from '../services/data.service';
import { PublicProfileService } from '../services/public-profile.service';
import { ImagePerf } from '../services/image-perf.service';
import type { Article, PublicProfile } from '../types';

interface ScoredArticle {
  article: Article;
  score: number;
}

const TITLE_WEIGHT    = 8;
const SUMMARY_WEIGHT  = 3;
const CATEGORY_WEIGHT = 5;
const TAG_WEIGHT      = 4;
const AUTHOR_WEIGHT   = 6;
/** Logarithmic engagement boost capped so a 100k-like article doesn't crush relevance. */
const MAX_ENGAGEMENT_BOOST = 4;

/**
 * Search view.
 *
 * Two result strips, both ranked:
 *   1. **Articles** — multi-field weighted match on title / summary /
 *      category / tags / author with a logarithmic engagement boost.
 *   2. **Auteurs** — server-side ILIKE on `username` and `displayName`
 *      via {@link PublicProfileService.search}, debounced by 250 ms.
 *
 * The substring filter from v1 is gone — articles now surface in
 * relevance order, not insertion order, so the most useful match
 * lands at slot zero.
 */
@Component({
  selector: 'app-search-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-black flex flex-col pt-12">
      <div class="px-6 shrink-0">
        <h1 class="text-2xl font-[1000] uppercase text-white tracking-tighter mb-6">Recherche</h1>

        <div class="relative mb-6">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Sujets, articles, auteurs..."
            aria-label="Champ de recherche"
            class="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 text-white rounded-xl outline-none focus:border-white transition-colors" />
          <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"></lucide-icon>
          @if (searchQuery()) {
            <button type="button" (click)="clearQuery()" aria-label="Effacer la recherche"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
            </button>
          }
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 pb-32">
        @if (!searchQuery()) {
          <div class="h-full flex flex-col items-center justify-center text-zinc-600">
            <lucide-icon name="search" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
            <p class="text-sm font-medium">Recherchez dans l'audit CakeNews</p>
            <div class="flex flex-wrap justify-center gap-2 mt-6">
              @for (tag of ['Tech', 'Politique', 'Économie', 'Société']; track tag) {
                <button type="button" (click)="setQuery(tag)"
                  class="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors uppercase">
                  #{{ tag }}
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- People strip -->
          @if (people().length > 0) {
            <section class="mb-8">
              <h2 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                Auteurs · {{ people().length }}
              </h2>
              <ul class="space-y-2">
                @for (p of people(); track p.uid) {
                  <li>
                    <button type="button" (click)="openProfile(p.username ?? '')"
                      class="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] active:scale-[0.99] transition-all text-left">
                      <div class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                           [ngStyle]="{ 'background-color': p.avatarBg ?? '#7ae25c' }">
                        @if (p.photoURL) {
                          <img [src]="p.photoURL" alt="" referrerpolicy="no-referrer" loading="lazy"
                            class="w-[120%] h-[120%] object-contain" />
                        } @else {
                          <span class="text-sm font-black text-black">{{ initials(p.displayName) }}</span>
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-[13.5px] font-bold text-white truncate">{{ p.displayName }}</h3>
                        <p class="text-[11px] text-zinc-500 truncate">&#64;{{ p.username }}</p>
                      </div>
                      <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600 shrink-0"></lucide-icon>
                    </button>
                  </li>
                }
              </ul>
            </section>
          }

          <!-- Article results -->
          @if (results().length === 0 && people().length === 0) {
            <div class="py-12 flex flex-col items-center text-zinc-600">
              <lucide-icon name="file-question" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
              <p class="text-sm font-medium">Aucun résultat trouvé pour « {{ searchQuery() }} »</p>
            </div>
          } @else if (results().length > 0) {
            <h2 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
              Articles · {{ results().length }}
            </h2>
            <div class="space-y-6">
              @for (article of results(); track article.id) {
                <button type="button" (click)="goToArticle(article.id)"
                  class="w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors text-left">
                  <div class="h-32 w-full relative">
                    <img [src]="thumb(article.imageUrl)" [srcset]="thumbSet(article.imageUrl)" sizes="100vw"
                      referrerpolicy="no-referrer" loading="lazy"
                      class="w-full h-full object-cover" alt="" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div class="absolute bottom-3 left-3">
                      <span class="text-[9px] font-black uppercase tracking-widest bg-white text-black px-1.5 py-0.5 rounded">{{ article.category }}</span>
                    </div>
                  </div>
                  <div class="p-4">
                    <h3 class="text-white font-bold text-sm leading-tight mb-2">{{ article.title }}</h3>
                    <p class="text-zinc-400 text-xs line-clamp-2">{{ article.summary }}</p>
                    <div class="flex items-center gap-3 mt-4 text-[10px] font-mono text-zinc-500">
                      <span class="flex items-center gap-1"><lucide-icon name="heart" class="w-3 h-3"></lucide-icon> {{ article.likes ?? 0 }}</span>
                      <span class="flex items-center gap-1"><lucide-icon name="message-square" class="w-3 h-3"></lucide-icon> {{ article.comments ?? 0 }}</span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class SearchViewComponent {
  private dataService = inject(DataService);
  private profileService = inject(PublicProfileService);
  private router = inject(Router);
  private imagePerf = inject(ImagePerf);

  readonly searchQuery = signal('');
  readonly people = signal<PublicProfile[]>([]);

  /** Articles ranked by relevance to the current query. */
  readonly results = computed<Article[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];

    const inventory = this.dataService.articles().filter(
      a => (a.status ?? 'published') === 'published'
    );
    const scored: ScoredArticle[] = [];
    for (const a of inventory) {
      const s = this.scoreArticle(a, q);
      if (s > 0) scored.push({ article: a, score: s });
    }
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, 50).map(s => s.article);
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // When the query stabilises for 250 ms, fire the people search.
    effect(() => {
      const q = this.searchQuery();
      if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
      if (!q.trim()) { this.people.set([]); return; }
      this.debounceTimer = setTimeout(() => {
        void this.profileService.search(q.trim(), 8).then(p => this.people.set(p));
      }, 250);
    });
  }

  // --- Scoring ----------------------------------------------------

  private scoreArticle(a: Article, q: string): number {
    let score = 0;
    if (a.title.toLowerCase().includes(q))     score += TITLE_WEIGHT;
    if (a.summary?.toLowerCase().includes(q))  score += SUMMARY_WEIGHT;
    if (a.category.toLowerCase().includes(q))  score += CATEGORY_WEIGHT;
    if (a.author.toLowerCase().includes(q))    score += AUTHOR_WEIGHT;
    if (a.tags?.some(t => t.toLowerCase().includes(q))) score += TAG_WEIGHT;

    // Whole-word boost on the title.
    const words = a.title.toLowerCase().split(/\s+/);
    if (words.some(w => w === q)) score += TITLE_WEIGHT;

    if (score === 0) return 0;

    // Logarithmic engagement boost — capped so a runaway article
    // doesn't outrank a perfect title match on a quieter piece.
    const engagement = Math.min(
      MAX_ENGAGEMENT_BOOST,
      Math.log10(1 + (a.likes ?? 0) + (a.comments ?? 0) * 2)
    );
    return score + engagement;
  }

  // --- UI handlers ------------------------------------------------

  onQueryChange(_: string): void { /* signal already updated by ngModel */ }
  setQuery(q: string): void { this.searchQuery.set(q); }
  clearQuery(): void { this.searchQuery.set(''); }

  goToArticle(id: string): void {
    void this.router.navigate(['/article', id]);
  }

  openProfile(username: string): void {
    if (!username) return;
    void this.router.navigate(['/u', username]);
  }

  thumb(url: string | undefined): string {
    return this.imagePerf.optimised(url, 480, { quality: 70 });
  }
  thumbSet(url: string | undefined): string {
    return this.imagePerf.srcset(url, [320, 480, 720]);
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';
  }
}
