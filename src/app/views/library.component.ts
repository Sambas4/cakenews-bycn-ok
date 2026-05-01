import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../services/interaction.service';
import { DataService } from '../services/data.service';
import type { Article } from '../types';
import { CATEGORY_COLORS } from '../constants';

type LibraryKind = 'saved' | 'history' | 'likes';

interface KindMeta {
  title: string;
  emptyTitle: string;
  emptyHint: string;
  icon: string;
  accent: string;
}

const KINDS: Record<LibraryKind, KindMeta> = {
  saved: {
    title: 'Sauvegardés',
    emptyTitle: 'Rien dans tes signets',
    emptyHint: 'Touche le marque-page sur un article pour le retrouver ici.',
    icon: 'bookmark',
    accent: '#38bdf8',
  },
  history: {
    title: 'Historique',
    emptyTitle: 'Pas encore de lecture',
    emptyHint: 'Les articles que tu lis viennent s\'aligner ici dans l\'ordre.',
    icon: 'history',
    accent: '#a78bfa',
  },
  likes: {
    title: 'Likés',
    emptyTitle: 'Aucun like pour le moment',
    emptyHint: 'Touche le cœur d\'un article que tu approuves pour l\'archiver.',
    icon: 'heart',
    accent: '#fb7185',
  },
};

/**
 * Library view — concrete destination for the three profile shortcuts
 * (Sauvegardés / Historique / Likés). Reads source of truth from
 * {@link InteractionService} and reconciles ids against the article
 * inventory loaded by {@link DataService}.
 *
 * Tap on a card → opens the article via the regular feed routing.
 * The feed receives the article id and the reactive buffer pins it
 * as the first slot (see A3 — feed deep-link integration).
 */
@Component({
  selector: 'app-library-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-black flex flex-col text-white">
      <!-- Top bar -->
      <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] z-10 shrink-0">
        <button type="button" (click)="goBack()" aria-label="Retour"
          class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
          <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
        </button>
        <div class="flex items-center gap-2">
          <lucide-icon [name]="meta().icon" class="w-4 h-4" [style.color]="meta().accent"></lucide-icon>
          <h1 class="text-[14px] font-[1000] tracking-tight">{{ meta().title }}</h1>
        </div>
        <span class="text-[10px] font-bold tabular-nums text-zinc-500">{{ articles().length }}</span>
      </header>

      <!-- List -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pb-24">
        @if (articles().length === 0) {
          <div class="px-8 pt-32 flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <lucide-icon [name]="meta().icon" class="w-7 h-7 text-zinc-500"></lucide-icon>
            </div>
            <p class="text-[13px] font-bold text-white">{{ meta().emptyTitle }}</p>
            <p class="text-[11.5px] text-zinc-500 mt-2 leading-snug max-w-[280px]">{{ meta().emptyHint }}</p>
          </div>
        } @else {
          <ul class="px-3 pt-3 space-y-2">
            @for (article of articles(); track article.id) {
              <li>
                <button type="button" (click)="open(article.id)"
                  class="w-full flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] active:scale-[0.99] transition-all text-left">
                  <div class="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 shrink-0 relative">
                    <img [src]="article.imageUrl" alt="" referrerpolicy="no-referrer" loading="lazy"
                      class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-white"
                        [style.backgroundColor]="catColor(article.category)">
                        {{ article.category }}
                      </span>
                      @if (article.isExclusive) {
                        <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                          Exclu
                        </span>
                      }
                    </div>
                    <h2 class="text-[13.5px] font-bold text-white leading-tight line-clamp-2">{{ article.title }}</h2>
                    <p class="text-[11px] text-zinc-500 line-clamp-1 mt-1">{{ article.author }}</p>
                  </div>
                  <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600 self-center shrink-0"></lucide-icon>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class LibraryViewComponent {
  private interaction = inject(InteractionService);
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  readonly kind = signal<LibraryKind>(this.parseKind(this.route.snapshot.paramMap.get('kind')));
  readonly meta = computed(() => KINDS[this.kind()]);

  readonly articles = computed<Article[]>(() => {
    const inventory = new Map(this.data.articles().map(a => [a.id, a]));
    const ids = this.idsForKind(this.kind());
    // History needs reverse-chronological (latest first).
    const ordered = this.kind() === 'history' ? [...ids].reverse() : ids;
    return ordered.map(id => inventory.get(id)).filter((a): a is Article => Boolean(a));
  });

  catColor(cat: string): string {
    return (CATEGORY_COLORS as Record<string, string>)[cat] ?? '#27272a';
  }

  goBack() {
    this.location.back();
  }

  open(id: string) {
    void this.router.navigate(['/article', id]);
  }

  private parseKind(raw: string | null): LibraryKind {
    if (raw === 'history' || raw === 'likes' || raw === 'saved') return raw;
    return 'saved';
  }

  private idsForKind(kind: LibraryKind): string[] {
    switch (kind) {
      case 'history': return this.interaction.readArticles();
      case 'likes':   return this.interaction.likedArticles();
      default:        return this.interaction.savedArticles();
    }
  }
}
