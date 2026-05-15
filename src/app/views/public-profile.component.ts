import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PublicProfileService } from '../services/public-profile.service';
import { FollowService } from '../services/follow.service';
import { DataService } from '../services/data.service';
import { ToastService } from '../services/toast.service';
import { ImagePerf } from '../services/image-perf.service';
import { CATEGORY_COLORS } from '../constants';
import { Article, PublicProfile } from '../types';

/**
 * Read-only profile page reachable at `/u/:username`. Renders the
 * public bits of someone else's identity — display name, bio, photo —
 * plus a follow toggle and a sample of their published articles.
 *
 * Design intent:
 *   * The view stays close to the owner's profile-hero visually
 *     so the brand feels coherent, but never exposes private fields
 *     (email, role, trust ledger).
 *   * The follow button is the primary action — it routes through
 *     {@link FollowService} which already feeds the Cercle lane.
 *   * If the username isn't found, we render an empty state with a
 *     route back to the feed; we never show a confusing 404 screen.
 */
@Component({
  selector: 'app-public-profile-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-black flex flex-col text-white relative overflow-hidden">

      <!-- Top bar -->
      <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] z-10 shrink-0">
        <button type="button" (click)="goBack()" aria-label="Retour"
          class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
          <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
        </button>
        <h1 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Profil</h1>
        <span class="w-9 h-9"></span>
      </header>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/80 animate-spin" aria-hidden="true"></div>
        </div>
      } @else if (!profile()) {
        <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
            <lucide-icon name="user" class="w-7 h-7 text-zinc-500"></lucide-icon>
          </div>
          <p class="text-[13px] font-bold text-white">Profil introuvable</p>
          <p class="text-[11.5px] text-zinc-500 mt-2 leading-snug max-w-[280px]">
            Le pseudo {{ usernameParam() ? '@' + usernameParam() : '' }} n'est rattaché à aucun compte CakeNews.
          </p>
        </div>
      } @else {
        <!-- Hero -->
        <section class="px-6 pt-6 pb-5 relative overflow-hidden flex-shrink-0">
          <div aria-hidden="true" class="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#7ae25c]/15 blur-[100px] pointer-events-none"></div>

          <div class="relative flex items-center gap-4">
            <div class="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center"
                 [ngStyle]="{ 'background-color': profile()!.avatarBg ?? '#7ae25c' }">
              @if (profile()!.photoURL) {
                <img [src]="profile()!.photoURL" alt="" referrerpolicy="no-referrer" loading="lazy"
                  class="w-[120%] h-[120%] object-contain" />
              } @else {
                <span class="text-2xl font-black text-black">{{ initials() }}</span>
              }
            </div>

            <div class="flex-1 min-w-0">
              <h2 class="text-[20px] font-[1000] tracking-tight text-white truncate">
                {{ profile()!.displayName }}
              </h2>
              <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 font-semibold truncate">
                <lucide-icon name="at-sign" class="w-3 h-3"></lucide-icon>
                <span class="truncate">{{ profile()!.username }}</span>
              </div>
            </div>

            <button type="button" (click)="toggleFollow()"
              class="shrink-0 inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-[10.5px] font-black uppercase tracking-widest transition-all active:scale-[0.97]"
              [attr.aria-pressed]="isFollowing()"
              [ngClass]="isFollowing()
                ? 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.08]'
                : 'bg-[#7ae25c] text-black hover:bg-[#9aef82]'">
              <lucide-icon [name]="isFollowing() ? 'check' : 'user-plus'" class="w-3.5 h-3.5"></lucide-icon>
              {{ isFollowing() ? 'Suivi' : 'Suivre' }}
            </button>
          </div>

          @if (profile()!.bio) {
            <p class="relative mt-4 text-[13px] text-zinc-300 leading-relaxed line-clamp-4">{{ profile()!.bio }}</p>
          }
        </section>

        <!-- Articles published by this author -->
        <div class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-24">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-3 mb-3">
            Publications · {{ articles().length }}
          </h3>

          @if (articles().length === 0) {
            <p class="text-[12.5px] text-zinc-500 ml-3">Pas encore d'article publié.</p>
          } @else {
            <ul class="space-y-2">
              @for (article of articles(); track article.id) {
                <li>
                  <button type="button" (click)="openArticle(article.id)"
                    class="w-full flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] active:scale-[0.99] transition-all text-left">
                    <div class="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 shrink-0 relative">
                      <img [src]="thumb(article.imageUrl)" [srcset]="thumbSet(article.imageUrl)" sizes="80px"
                        alt="" referrerpolicy="no-referrer" loading="lazy"
                        class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-white"
                        [style.backgroundColor]="catColor(article.category)">{{ article.category }}</span>
                      <h4 class="text-[13.5px] font-bold text-white leading-tight line-clamp-2 mt-1">{{ article.title }}</h4>
                      <p class="text-[11px] text-zinc-500 mt-1">
                        {{ article.likes ?? 0 }} J'aime · {{ article.comments ?? 0 }} commentaires
                      </p>
                    </div>
                    <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600 self-center shrink-0"></lucide-icon>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class PublicProfileViewComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private profileService = inject(PublicProfileService);
  private follows = inject(FollowService);
  private data = inject(DataService);
  private toast = inject(ToastService);
  private imagePerf = inject(ImagePerf);

  readonly loading = signal(true);
  readonly profile = signal<PublicProfile | null>(null);
  readonly usernameParam = signal<string>('');

  readonly isFollowing = computed(() => {
    const p = this.profile();
    return !!p && this.follows.isFollowing('author', p.displayName);
  });

  readonly initials = computed(() => {
    const n = this.profile()?.displayName ?? '';
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U';
  });

  readonly articles = computed<Article[]>(() => {
    const p = this.profile();
    if (!p) return [];
    return this.data.articles()
      .filter(a => (a.status ?? 'published') === 'published'
        && (a.author === p.displayName || (a as { author_uid?: string }).author_uid === p.uid))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  });

  constructor() {
    this.route.paramMap.subscribe(async (params) => {
      const handle = (params.get('username') ?? '').trim();
      this.usernameParam.set(handle);
      this.loading.set(true);
      this.profile.set(null);
      try {
        if (handle) this.profile.set(await this.profileService.fetchByUsername(handle));
      } finally {
        this.loading.set(false);
      }
    });
  }

  toggleFollow(): void {
    const p = this.profile();
    if (!p) return;
    const nowFollowing = this.follows.toggle('author', p.displayName);
    this.toast.showToast(
      nowFollowing ? `Tu suis désormais ${p.displayName}` : `Tu ne suis plus ${p.displayName}`,
      nowFollowing ? 'success' : 'info',
    );
  }

  goBack(): void { this.location.back(); }

  openArticle(id: string): void {
    void this.router.navigate(['/article', id]);
  }

  thumb(url: string | undefined): string {
    return this.imagePerf.optimised(url, 80, { quality: 65 });
  }
  thumbSet(url: string | undefined): string {
    return this.imagePerf.srcset(url, [80, 160, 240]);
  }

  catColor(cat: string): string {
    return (CATEGORY_COLORS as Record<string, string>)[cat] ?? '#27272a';
  }
}
