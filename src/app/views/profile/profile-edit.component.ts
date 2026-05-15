import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Logger } from '../../services/logger.service';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';
import { TranslationService } from '../../services/translation.service';

const AVATAR_BG = ['#7ae25c', '#F9A8D4', '#C4B5FD', '#93C5FD', '#FDE047', '#FDBA74', '#F472B6', '#FB7185'];
const AVATAR_SEEDS = [
  'Aurora','Pixel','Nova','Echo','Felix','Kira','Ruby','Onyx','Vega','Orion','Lumen','Sable','Indigo','Coral','Stella','Atlas',
];

/**
 * Profile edit sheet — slides up over the profile view. Lets the user
 * change their display name, username, bio and avatar (URL or seed).
 *
 * Persists via {@link UserService}. The parent owns visibility.
 */
@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective],
  template: `
    <div class="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] flex items-end sm:items-center justify-center" (click)="onBackdrop($event)">
      <div class="w-full max-w-[450px] bg-zinc-950 border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl flex flex-col max-h-[92vh] overflow-hidden animate-[slideUp_0.25s_ease-out]"
           role="dialog" aria-modal="true" aria-label="Édition du profil"
           appFocusTrap (escape)="close.emit()">
        <!-- Header -->
        <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.06] shrink-0">
          <button type="button" (click)="close.emit()" class="text-zinc-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
          </button>
          <h2 class="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-300">{{ t()('PROFILE_EDIT_TITLE') }}</h2>
          <button type="button" (click)="save()" [disabled]="saving() || !canSave()"
            class="text-[11px] font-black uppercase tracking-widest text-[#7ae25c] disabled:opacity-40 disabled:cursor-not-allowed">
            @if (saving()) {
              <lucide-icon name="loader" class="w-4 h-4 animate-spin"></lucide-icon>
            } @else {
              Enregistrer
            }
          </button>
        </header>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

          <!-- Avatar preview -->
          <div class="flex flex-col items-center">
            <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-white/[0.06] flex items-center justify-center"
                 [ngStyle]="{ 'background-color': avatarBg() }">
              <img [src]="avatarUrl()" alt="" referrerpolicy="no-referrer" class="w-[120%] h-[120%] object-contain" />
            </div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-3">Aperçu</p>
          </div>

          <!-- Avatar seed picker -->
          <section>
            <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{{ t()('PROFILE_AVATAR') }}</h3>
            <div class="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
              @for (seed of seeds; track seed; let i = $index) {
                <button type="button" (click)="seedIdx.set(i)"
                  class="shrink-0 w-16 h-16 rounded-2xl border-2 transition-all flex items-center justify-center overflow-hidden"
                  [ngStyle]="{ 'background-color': avatarBg() }"
                  [ngClass]="seedIdx() === i ? 'border-[#7ae25c] scale-105 shadow-lg' : 'border-white/[0.06]'">
                  <img [src]="seedUrl(seed)" alt="" referrerpolicy="no-referrer" class="w-[120%] h-[120%] object-contain" />
                </button>
              }
            </div>
          </section>

          <!-- Bg color -->
          <section>
            <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{{ t()('PROFILE_AVATAR_BG') }}</h3>
            <div class="flex gap-2 flex-wrap">
              @for (c of bgColors; track c) {
                <button type="button" (click)="avatarBg.set(c)"
                  [attr.aria-label]="'Couleur de fond ' + c"
                  [attr.aria-pressed]="avatarBg() === c"
                  class="w-11 h-11 rounded-full border-2 transition-transform hover:scale-110"
                  [ngStyle]="{ 'background-color': c }"
                  [ngClass]="avatarBg() === c ? 'border-white scale-110 shadow-lg' : 'border-white/10'"></button>
              }
            </div>
          </section>

          <!-- Display name -->
          <section>
            <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">{{ t()('PROFILE_DISPLAY_NAME') }}</label>
            <input type="text" [(ngModel)]="displayName" maxlength="40"
              class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] font-semibold outline-none focus:border-[#7ae25c] transition-colors"
              placeholder="Ton nom public" />
          </section>

          <!-- Username -->
          <section>
            <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">{{ t()('PROFILE_USERNAME') }}</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[14px] font-semibold">&#64;</span>
              <input type="text" [(ngModel)]="username" maxlength="24"
                (ngModelChange)="usernameChanged($event)"
                class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-white text-[14px] font-semibold outline-none focus:border-[#7ae25c] transition-colors"
                placeholder="ton_pseudo" />
            </div>
            <p class="text-[10px] text-zinc-500 mt-1.5">{{ t()('PROFILE_USERNAME_HINT') }}</p>
          </section>

          <!-- Bio -->
          <section>
            <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">{{ t()('PROFILE_BIO') }}</label>
            <textarea [(ngModel)]="bio" maxlength="160" rows="3"
              class="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] outline-none focus:border-[#7ae25c] transition-colors resize-none"
              [placeholder]="t()('PROFILE_BIO_PLACEHOLDER')"></textarea>
            <div class="flex justify-end text-[10px] text-zinc-600 mt-1">{{ bio().length }}/160</div>
          </section>

        </div>
      </div>
    </div>
  `
})
export class ProfileEditComponent {
  close = output<void>();

  private user = inject(UserService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private logger = inject(Logger);
  private translation = inject(TranslationService);
  protected t = this.translation.t;

  readonly seeds = AVATAR_SEEDS;
  readonly bgColors = AVATAR_BG;

  readonly displayName = signal(this.user.currentUserProfile()?.displayName ?? '');
  readonly username = signal(this.user.currentUserProfile()?.username ?? '');
  readonly bio = signal(this.user.currentUserProfile()?.bio ?? '');
  readonly avatarBg = signal(this.user.currentUserProfile()?.avatarBg ?? '#7ae25c');

  // The seed is decoupled from the URL so we can re-derive a clean
  // dicebear URL on save without regex-parsing the existing one.
  readonly seedIdx = signal<number>(0);

  readonly avatarUrl = computed(() => this.seedUrl(this.seeds[this.seedIdx()] ?? this.seeds[0]));

  readonly saving = signal(false);

  readonly canSave = computed(() => {
    const u = this.username().trim();
    const n = this.displayName().trim();
    return n.length >= 2 && u.length >= 3 && /^[a-zA-Z0-9_]+$/.test(u);
  });

  seedUrl(seed: string): string {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
  }

  usernameChanged(v: string) {
    // Normalise as the user types — strict allow-list. Avoids surprises.
    const cleaned = v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 24);
    if (cleaned !== v) this.username.set(cleaned);
  }

  onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.close.emit();
  }

  async save() {
    if (!this.canSave() || this.saving()) return;
    const uid = this.auth.currentUser()?.id;
    if (!uid) return;

    this.saving.set(true);
    try {
      await this.user.updateUserProfile(uid, {
        displayName: this.displayName().trim(),
        username: this.username().trim(),
        bio: this.bio().trim() || undefined,
        photoURL: this.avatarUrl(),
        avatarUrl: this.avatarUrl(),
        avatarBg: this.avatarBg(),
      });
      this.toast.showToast('Profil mis à jour', 'success');
      this.close.emit();
    } catch (e) {
      this.logger.error('profile.save', e);
      this.toast.showToast("Échec de la sauvegarde", 'error');
    } finally {
      this.saving.set(false);
    }
  }
}
