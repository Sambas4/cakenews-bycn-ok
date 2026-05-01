import { Component, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../services/user.service';
import { InteractionService } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';

/**
 * Hero header for the user profile. Renders the avatar, identity,
 * trust ring and a 3-up stat strip (likes given, articles read, comments).
 *
 * Pure-presentation: lifecycle and mutations are owned by the parent.
 */
@Component({
  selector: 'app-profile-hero',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="relative px-6 pt-6 pb-5 overflow-hidden flex-shrink-0">
      <!-- ambient gradient -->
      <div aria-hidden="true" class="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#7ae25c]/15 blur-[100px] pointer-events-none"></div>
      <div aria-hidden="true" class="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none"></div>

      <!-- identity row -->
      <div class="relative flex items-center gap-4">
        <!-- avatar with trust ring -->
        <div class="relative w-[72px] h-[72px] flex items-center justify-center">
          <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90 w-full h-full">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4" />
            <circle cx="50" cy="50" r="46" fill="none"
              [attr.stroke]="trustColor()"
              stroke-width="4" stroke-linecap="round"
              [attr.stroke-dasharray]="trustCircumference()"
              [attr.stroke-dashoffset]="trustOffset()"
              style="transition: stroke-dashoffset 0.6s cubic-bezier(0.2,0.8,0.2,1);"
            />
          </svg>
          <div class="w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center"
               [ngStyle]="{ 'background-color': avatarBg() }">
            @if (avatarUrl()) {
              <img [src]="avatarUrl()!" alt="" referrerpolicy="no-referrer" class="w-[120%] h-[120%] object-contain" />
            } @else {
              <span class="text-xl font-black text-black">{{ initials() }}</span>
            }
          </div>
        </div>

        <!-- name + handle -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <h1 class="text-[20px] font-[1000] tracking-tight text-white truncate">
              {{ displayName() }}
            </h1>
            @if (isAdmin()) {
              <span class="shrink-0 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded px-1.5 py-0.5">
                <lucide-icon name="shield-check" class="w-2.5 h-2.5"></lucide-icon> Studio
              </span>
            }
          </div>
          <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 font-semibold truncate">
            <lucide-icon name="at-sign" class="w-3 h-3"></lucide-icon>
            <span class="truncate">{{ username() }}</span>
          </div>
          <div class="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest"
               [style.color]="trustColor()">
            <lucide-icon name="shield" class="w-3 h-3"></lucide-icon>
            Trust {{ trustScore() }} · {{ trustLabel() }}
          </div>
        </div>

        <!-- edit button -->
        <button
          type="button"
          (click)="editClick.emit()"
          class="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
          aria-label="Éditer le profil">
          <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon>
        </button>
      </div>

      <!-- bio -->
      @if (bio()) {
        <p class="relative mt-4 text-[13px] text-zinc-300 leading-relaxed line-clamp-3">{{ bio() }}</p>
      } @else {
        <button type="button"
          (click)="editClick.emit()"
          class="relative mt-4 text-[12px] text-zinc-500 italic underline decoration-dotted underline-offset-2 hover:text-zinc-300 transition-colors">
          Ajouter une bio…
        </button>
      }

      <!-- stats strip -->
      <div class="relative grid grid-cols-3 gap-2 mt-5">
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl py-3 flex flex-col items-center">
          <span class="text-[18px] font-[1000] text-white tabular-nums">{{ readCount() }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">Lus</span>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl py-3 flex flex-col items-center">
          <span class="text-[18px] font-[1000] text-white tabular-nums">{{ likedCount() }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">Likés</span>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl py-3 flex flex-col items-center">
          <span class="text-[18px] font-[1000] text-white tabular-nums">{{ savedCount() }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">Sauvés</span>
        </div>
      </div>
    </section>
  `
})
export class ProfileHeroComponent {
  /** Fired when the user taps the edit button. */
  editClick = output<void>();

  private user = inject(UserService);
  private interaction = inject(InteractionService);
  private auth = inject(AuthService);

  displayName = computed(() => this.user.currentUserProfile()?.displayName
    || this.user.currentUserProfile()?.username
    || 'Utilisateur');
  username = computed(() => this.user.currentUserProfile()?.username || 'user');
  bio = computed(() => this.user.currentUserProfile()?.bio || '');
  isAdmin = computed(() => Boolean(this.user.currentUserProfile()?.isAdmin || this.auth.isAdmin()));

  avatarUrl = computed(() => this.user.currentUserProfile()?.photoURL
    || this.user.currentUserProfile()?.avatarUrl
    || null);
  avatarBg = computed(() => this.user.currentUserProfile()?.avatarBg || '#7ae25c');

  initials = computed(() => {
    const n = this.displayName();
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'C';
  });

  readCount = computed(() => this.interaction.readArticles().length);
  likedCount = computed(() => this.interaction.likedArticles().length);
  savedCount = computed(() => this.interaction.savedArticles().length);

  trustScore = computed(() => this.interaction.userStats().trustScore ?? 100);
  trustLabel = computed(() => {
    const s = this.trustScore();
    if (s >= 90) return 'Vérifié';
    if (s >= 70) return 'Confirmé';
    if (s >= 50) return 'En croissance';
    return 'Probation';
  });
  trustColor = computed(() => {
    const s = this.trustScore();
    if (s >= 90) return '#7ae25c';
    if (s >= 70) return '#38bdf8';
    if (s >= 50) return '#facc15';
    return '#f97316';
  });
  trustCircumference = computed(() => 2 * Math.PI * 46);
  trustOffset = computed(() => {
    const c = this.trustCircumference();
    const ratio = Math.max(0, Math.min(1, this.trustScore() / 100));
    return c * (1 - ratio);
  });
}
