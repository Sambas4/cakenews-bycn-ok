import { Component, inject, computed, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../../services/interaction.service';
import { TranslationService } from '../../services/translation.service';
import { PrivacyService } from '../../services/privacy.service';
import { DataExportService } from '../../services/data-export.service';
import { CATEGORY_COLORS, THEME_GROUPS } from '../../constants';
import type { Category } from '../../types';

const GROUP_META: Record<string, { label: string; icon: string }> = {
  ACTUALITES: { label: 'Actualités', icon: 'monitor' },
  FUTUR: { label: 'Futur & Tech', icon: 'zap' },
  LIFESTYLE: { label: 'Lifestyle', icon: 'heart' },
  DIVERTISSEMENT: { label: 'Divertissement', icon: 'sparkles' },
  SPORTS: { label: 'Sports', icon: 'flame' },
  SENSITIVE: { label: 'Zone Rouge', icon: 'shield-alert' },
  UNCENSORED: { label: 'Adulte (18+)', icon: 'eye-off' },
};

/**
 * Settings tab. Hosts:
 *  - Notification toggles (replies, breaking news, digest cadence)
 *  - Privacy (activity visibility, DMs)
 *  - Accessibility (reduce motion, larger text)
 *  - Language picker
 *  - Algorithm interests selector with sensitive-content gating
 *  - Danger zone (logout, delete account)
 *
 * State for preferences is persisted to localStorage; remote sync is the
 * caller's responsibility (out of scope for the UI shell).
 */
@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-[slideUp_0.25s_ease-out]">

      <!-- Notifications -->
      <section>
        <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Notifications</h3>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
          @for (item of notifToggles; track item.key) {
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <lucide-icon [name]="item.icon" class="w-4 h-4 text-zinc-300"></lucide-icon>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-bold text-white leading-tight">{{ item.label }}</span>
                  <span class="text-[10.5px] text-zinc-500 truncate">{{ item.hint }}</span>
                </div>
              </div>
              <button type="button"
                (click)="toggleNotif(item.key); $event.preventDefault()"
                class="relative w-10 h-6 rounded-full transition-colors shrink-0"
                [ngClass]="prefs()[item.key] ? 'bg-[#7ae25c]' : 'bg-white/10'">
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  [ngClass]="prefs()[item.key] ? 'left-[18px]' : 'left-0.5'"></span>
              </button>
            </label>
          }
        </div>
      </section>

      <!-- Privacy -->
      <section>
        <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Confidentialité</h3>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <lucide-icon name="eye" class="w-4 h-4 text-zinc-300"></lucide-icon>
              </div>
              <span class="text-[13px] font-bold text-white">Activité visible</span>
            </div>
            <button type="button" (click)="toggleNotif('showActivity')"
              class="relative w-10 h-6 rounded-full transition-colors"
              [ngClass]="prefs().showActivity ? 'bg-[#7ae25c]' : 'bg-white/10'">
              <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                [ngClass]="prefs().showActivity ? 'left-[18px]' : 'left-0.5'"></span>
            </button>
          </div>

          <!-- Privacy / amnesic mode -->
          <div class="px-4 py-3.5 border-b border-white/[0.04]">
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <lucide-icon name="shield" class="w-4 h-4 text-emerald-300"></lucide-icon>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-bold text-white">Mode privé</span>
                  <span class="text-[10.5px] text-zinc-500 leading-snug">
                    Aucune session enregistrée, l'algorithme reste à distance
                  </span>
                </div>
              </div>
              <button type="button" (click)="privacy.toggle(); $event.preventDefault()"
                class="relative w-10 h-6 rounded-full transition-colors shrink-0"
                [ngClass]="privacy.enabled() ? 'bg-emerald-500' : 'bg-white/10'">
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  [ngClass]="privacy.enabled() ? 'left-[18px]' : 'left-0.5'"></span>
              </button>
            </label>
          </div>

          <div class="px-4 py-3.5">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <lucide-icon name="message-circle" class="w-4 h-4 text-zinc-300"></lucide-icon>
              </div>
              <span class="text-[13px] font-bold text-white">Messages directs</span>
            </div>
            <div class="grid grid-cols-3 gap-1.5 bg-black/30 p-1 rounded-xl border border-white/[0.04]">
              @for (opt of dmOptions; track opt.value) {
                <button type="button" (click)="setDm(opt.value)"
                  class="text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all"
                  [ngClass]="prefs().dm === opt.value ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
                  {{ opt.label }}
                </button>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Accessibility -->
      <section>
        <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Accessibilité</h3>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
          @for (item of a11yToggles; track item.key) {
            <label class="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
                  <lucide-icon [name]="item.icon" class="w-4 h-4 text-zinc-300"></lucide-icon>
                </div>
                <span class="text-[13px] font-bold text-white">{{ item.label }}</span>
              </div>
              <button type="button"
                (click)="toggleNotif(item.key); $event.preventDefault()"
                class="relative w-10 h-6 rounded-full transition-colors"
                [ngClass]="prefs()[item.key] ? 'bg-[#7ae25c]' : 'bg-white/10'">
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  [ngClass]="prefs()[item.key] ? 'left-[18px]' : 'left-0.5'"></span>
              </button>
            </label>
          }
        </div>
      </section>

      <!-- Algorithm interests -->
      <section>
        <div class="flex items-center justify-between mb-3 ml-1">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Personnaliser l'algorithme</h3>
          <span class="text-[10px] font-bold text-[#7ae25c]">{{ interestsCount() }} actifs</span>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-6">
          @for (group of themeGroups; track group.key) {
            @if (group.key !== 'SENSITIVE' && group.key !== 'UNCENSORED') {
              <div>
                <div class="flex items-center gap-2 mb-3 text-zinc-400">
                  <lucide-icon [name]="group.icon" class="w-3.5 h-3.5"></lucide-icon>
                  <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ group.label }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  @for (cat of group.categories; track cat) {
                    <button type="button" (click)="toggleInterest(cat)"
                      class="h-10 px-3 text-[10px] font-[1000] uppercase border rounded-lg flex items-center justify-between transition-all active:scale-[0.98]"
                      [ngClass]="isInterested(cat) ? 'bg-white text-black border-transparent shadow-lg' : 'bg-zinc-900 border-white/[0.08] text-zinc-500 hover:text-white'">
                      <span class="truncate mr-2">{{ cat }}</span>
                      <span class="w-2 h-2 rounded-full shrink-0"
                        [style.backgroundColor]="isInterested(cat) ? color(cat) : '#3f3f46'"></span>
                    </button>
                  }
                </div>
              </div>
            }
          }

          <!-- Sensitive content gate -->
          <div class="pt-4 border-t border-white/[0.06]">
            <button type="button" (click)="showSensitive.update(v => !v)"
              class="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-orange-400">
              <span class="flex items-center gap-2">
                <lucide-icon name="shield-alert" class="w-3.5 h-3.5"></lucide-icon>
                Contenus sensibles & adultes
              </span>
              <lucide-icon [name]="showSensitive() ? 'chevron-up' : 'chevron-down'" class="w-3.5 h-3.5"></lucide-icon>
            </button>
            @if (showSensitive()) {
              <div class="mt-4 space-y-4 animate-[slideUp_0.2s_ease-out]">
                @for (group of sensitiveGroups; track group.key) {
                  <div>
                    <div class="flex items-center gap-2 mb-2 text-orange-400/70">
                      <lucide-icon [name]="group.icon" class="w-3 h-3"></lucide-icon>
                      <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ group.label }}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      @for (cat of group.categories; track cat) {
                        <button type="button" (click)="toggleInterest(cat)"
                          class="h-10 px-3 text-[10px] font-[1000] uppercase border rounded-lg flex items-center justify-between transition-all"
                          [ngClass]="isInterested(cat) ? 'bg-orange-500/15 text-orange-200 border-orange-500/40' : 'bg-zinc-900 border-white/[0.08] text-zinc-600 hover:text-zinc-300'">
                          <span class="truncate mr-2">{{ cat }}</span>
                          <span class="w-2 h-2 rounded-full shrink-0" [style.backgroundColor]="isInterested(cat) ? color(cat) : '#27272a'"></span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Danger zone -->
      <section class="pt-4">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Compte</h3>
        <div class="space-y-2 mb-safe">
          <button type="button" (click)="exportData()" [disabled]="dataExport.busy()"
            class="w-full bg-white/[0.03] border border-white/[0.06] text-zinc-300 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/[0.06] transition-colors disabled:opacity-50">
            <lucide-icon [name]="dataExport.busy() ? 'loader' : 'download'" class="w-3.5 h-3.5" [class.animate-spin]="dataExport.busy()"></lucide-icon>
            Exporter mes données (RGPD)
          </button>
          <button type="button" (click)="logout.emit()"
            class="w-full bg-white/[0.03] border border-white/[0.06] text-zinc-300 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/[0.06] transition-colors">
            <lucide-icon name="log-out" class="w-3.5 h-3.5"></lucide-icon> Se déconnecter
          </button>
          <button type="button" (click)="deleteAccount.emit()"
            class="w-full bg-red-500/[0.04] border border-red-500/20 text-red-400/80 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <lucide-icon name="trash-2" class="w-3.5 h-3.5"></lucide-icon> Supprimer le compte
          </button>
        </div>
      </section>
    </div>
  `
})
export class ProfileSettingsComponent {
  logout = output<void>();
  deleteAccount = output<void>();

  private interaction = inject(InteractionService);
  private translation = inject(TranslationService);
  protected privacy = inject(PrivacyService);
  protected dataExport = inject(DataExportService);

  exportData(): void {
    void this.dataExport.download();
  }

  readonly showSensitive = signal(false);

  readonly notifToggles = [
    { key: 'replies', label: 'Réponses & mentions', hint: 'Quand on te cite ou te répond', icon: 'message-square' },
    { key: 'directMessages', label: 'Messages privés', hint: 'Pings chiffrés', icon: 'mail' },
    { key: 'breakingNews', label: 'Breaking news', hint: 'Alertes urgentes uniquement', icon: 'megaphone' },
    { key: 'digest', label: 'Digest hebdo', hint: 'Récap des moments forts', icon: 'archive' },
  ] as const;

  readonly a11yToggles = [
    { key: 'reduceMotion', label: 'Réduire les animations', icon: 'pause' },
    { key: 'largerText', label: 'Texte plus grand', icon: 'align-left' },
  ] as const;

  readonly dmOptions = [
    { value: 'everyone', label: 'Tous' },
    { value: 'verified', label: 'Vérifiés' },
    { value: 'none', label: 'Personne' },
  ] as const;

  readonly themeGroups = Object.entries(THEME_GROUPS).map(([key, categories]) => ({
    key,
    label: GROUP_META[key]?.label ?? key,
    icon: GROUP_META[key]?.icon ?? 'target',
    categories: categories as Category[],
  }));

  readonly sensitiveGroups = this.themeGroups.filter(g => g.key === 'SENSITIVE' || g.key === 'UNCENSORED');

  // Local-first prefs cache. Hydrated from localStorage on first read.
  readonly prefs = signal<Record<string, boolean | string>>(this.loadPrefs());

  interestsCount = computed(() => this.interaction.userInterests().length);

  isInterested(cat: Category): boolean {
    return this.interaction.userInterests().includes(cat);
  }

  toggleInterest(cat: Category) {
    this.interaction.toggleUserInterest(cat);
  }

  color(cat: Category): string {
    return CATEGORY_COLORS[cat];
  }

  toggleNotif(key: string) {
    this.prefs.update(p => {
      const next = { ...p, [key]: !p[key] };
      try { localStorage.setItem('cake_prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  setDm(value: string) {
    this.prefs.update(p => {
      const next = { ...p, dm: value };
      try { localStorage.setItem('cake_prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  private loadPrefs(): Record<string, boolean | string> {
    const defaults: Record<string, boolean | string> = {
      replies: true,
      directMessages: true,
      breakingNews: true,
      digest: false,
      showActivity: true,
      reduceMotion: false,
      largerText: false,
      dm: 'verified',
    };
    try {
      const raw = localStorage.getItem('cake_prefs');
      if (!raw) return defaults;
      return { ...defaults, ...(JSON.parse(raw) as Record<string, boolean | string>) };
    } catch {
      return defaults;
    }
  }
}
