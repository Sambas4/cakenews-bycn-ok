import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ToastService } from '../services/toast.service';
import { Logger } from '../services/logger.service';

import { ProfileHeroComponent } from './profile/profile-hero.component';
import { ProfileActivityComponent } from './profile/profile-activity.component';
import { ProfileSettingsComponent } from './profile/profile-settings.component';
import { ProfileEditComponent } from './profile/profile-edit.component';

type ProfileTab = 'activity' | 'settings';

/**
 * Premium profile shell — the page composes the hero, the tab strip and
 * either the activity or the settings panel. Confirmation flows for
 * logout / delete and the edit sheet are also owned at this level.
 */
@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule,
    ProfileHeroComponent, ProfileActivityComponent, ProfileSettingsComponent,
    ProfileEditComponent,
  ],
  template: `
    <div class="w-full h-full bg-black flex flex-col text-white relative overflow-hidden">

      <!-- Top bar -->
      <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] z-10 shrink-0">
        <button type="button" (click)="goBack()" aria-label="Retour"
          class="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
          <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
        </button>
        <h1 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Mon Espace</h1>
        @if (auth.isAdmin()) {
          <button type="button" (click)="goToAdmin()"
            class="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center hover:bg-indigo-500/25 transition-colors">
            <lucide-icon name="shield-check" class="w-4 h-4"></lucide-icon>
          </button>
        } @else {
          <span class="w-9 h-9"></span>
        }
      </header>

      <!-- Hero -->
      <app-profile-hero (editClick)="showEdit.set(true)"></app-profile-hero>

      <!-- Tab strip -->
      <div class="px-5 pb-3 shrink-0">
        <div class="flex bg-white/[0.04] rounded-2xl p-1 border border-white/[0.06]">
          <button type="button" (click)="tab.set('activity')"
            class="flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all"
            [ngClass]="tab() === 'activity' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
            Activité
          </button>
          <button type="button" (click)="tab.set('settings')"
            class="flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all"
            [ngClass]="tab() === 'settings' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
            Réglages
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar px-5 pb-24">
        @if (tab() === 'activity') {
          <app-profile-activity
            (openSaved)="goToFeedFiltered('saved')"
            (openHistory)="goToFeedFiltered('history')"
            (openLikes)="goToFeedFiltered('likes')">
          </app-profile-activity>
        } @else {
          <app-profile-settings
            (logout)="askLogout()"
            (deleteAccount)="askDelete()">
          </app-profile-settings>
        }
      </div>

      <!-- Confirm sheets -->
      @if (confirm() === 'logout') {
        <div class="absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] bg-zinc-900 border border-white/[0.08] rounded-2xl p-4 shadow-2xl animate-[slideUp_0.2s_ease-out] z-20">
          <p class="text-[13px] font-bold text-white mb-3 text-center">Se déconnecter ?</p>
          <div class="flex gap-2">
            <button type="button" (click)="confirm.set(null)"
              class="flex-1 py-3 rounded-xl bg-white/[0.04] text-white text-[11px] font-black uppercase tracking-widest">Annuler</button>
            <button type="button" (click)="performLogout()"
              class="flex-1 py-3 rounded-xl bg-red-500/15 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/25">Confirmer</button>
          </div>
        </div>
      } @else if (confirm() === 'delete') {
        <div class="absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] bg-zinc-900 border border-red-500/20 rounded-2xl p-4 shadow-2xl animate-[slideUp_0.2s_ease-out] z-20">
          <p class="text-[13px] font-bold text-white text-center">Supprimer le compte</p>
          <p class="text-[11px] text-zinc-400 text-center mt-1 leading-snug">
            Cette action est définitive et efface toutes tes données.
          </p>
          @if (deleteError()) {
            <p class="text-[10.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-3 text-center">
              {{ deleteError() }}
            </p>
          }
          <div class="flex gap-2 mt-3">
            <button type="button" (click)="confirm.set(null); deleteError.set('')"
              class="flex-1 py-3 rounded-xl bg-white/[0.04] text-white text-[11px] font-black uppercase tracking-widest">Annuler</button>
            <button type="button" (click)="performDelete()"
              class="flex-1 py-3 rounded-xl bg-red-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-500">Supprimer</button>
          </div>
        </div>
      }

      <!-- Edit sheet -->
      @if (showEdit()) {
        <app-profile-edit (close)="showEdit.set(false)"></app-profile-edit>
      }
    </div>
  `
})
export class ProfileViewComponent {
  public auth = inject(AuthService);
  public user = inject(UserService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private logger = inject(Logger);

  readonly tab = signal<ProfileTab>('activity');
  readonly showEdit = signal(false);
  readonly confirm = signal<'logout' | 'delete' | null>(null);
  readonly deleteError = signal('');

  goBack() { void this.router.navigate(['/feed']); }
  goToAdmin() { void this.router.navigate(['/admin']); }

  goToFeedFiltered(_kind: 'saved' | 'history' | 'likes') {
    // Hook for future filtered feed views; for now route to /feed.
    void this.router.navigate(['/feed']);
  }

  askLogout() { this.confirm.set('logout'); }
  askDelete() { this.confirm.set('delete'); this.deleteError.set(''); }

  async performLogout() {
    try {
      await this.auth.logout();
      this.toast.showToast('Déconnecté', 'success');
      void this.router.navigate(['/auth']);
    } catch (e) {
      this.logger.error('profile.logout', e);
      this.toast.showToast('Échec de déconnexion', 'error');
    } finally {
      this.confirm.set(null);
    }
  }

  async performDelete() {
    this.deleteError.set('');
    try {
      await this.auth.deleteAccount();
      void this.router.navigate(['/auth']);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.includes('requires-recent-login')) {
        this.deleteError.set('Reconnecte-toi puis recommence (sécurité).');
      } else {
        this.deleteError.set('Une erreur est survenue.');
      }
      this.logger.error('profile.delete', err);
    }
  }
}
