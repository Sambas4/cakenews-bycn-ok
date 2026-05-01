import { Injectable, signal, inject } from '@angular/core';
import { UserService } from './user.service';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Logger } from './logger.service';
import { LocalStorageCleanerService } from './local-storage-cleaner.service';
import { User } from '@supabase/supabase-js';

/**
 * Bootstrap super-admin UIDs are read from build-time env. They allow the very
 * first deployment to grant a super-admin role; afterwards roles must be
 * managed exclusively from the database. We use UIDs (opaque tokens), never
 * email addresses, so the production binary cannot be impersonated by anyone
 * controlling that email account.
 */
const BOOTSTRAP_SUPER_ADMIN_UIDS: string[] = (() => {
  const raw = (import.meta as any)?.env?.VITE_BOOTSTRAP_SUPER_ADMIN_UIDS as string | undefined;
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
})();

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userService = inject(UserService);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toast = inject(ToastService);
  private logger = inject(Logger);
  private cleaner = inject(LocalStorageCleanerService);

  currentUser = signal<User | null>(null);
  isAuthReady = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  isSuperAdmin = signal<boolean>(false);

  constructor() {
    void this.initAuth();
  }

  private async initAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      await this.handleUserChange(session?.user ?? null);
    } catch (e) {
      this.logger.error('initAuth: getSession failed', e);
      this.isAuthReady.set(true);
    }

    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        await this.handleUserChange(session?.user ?? null);
      }
    });
  }

  private async handleUserChange(user: User | null): Promise<void> {
    this.currentUser.set(user);

    if (!user) {
      this.userService.currentUserProfile.set(null);
      this.userService.currentPublicProfile.set(null);
      this.isAdmin.set(false);
      this.isSuperAdmin.set(false);
      this.isAuthReady.set(true);
      if (!this.router.url.includes('/auth')) {
        void this.router.navigate(['/auth']);
      }
      return;
    }

    try {
      let profile = await this.userService.fetchUserProfile(user.id);

      // Auto-create profile from OAuth metadata if missing
      if (!profile) {
        const email = user.email ?? '';
        const displayName = (user.user_metadata?.['full_name'] as string | undefined)
          ?? (email.split('@')[0] || 'User');
        const photoUrl = (user.user_metadata?.['avatar_url'] as string | undefined)
          ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(displayName)}`;
        const username = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
          || `user${Math.floor(Math.random() * 100000)}`;

        try {
          await this.userService.createUserProfile(user.id, displayName, email, photoUrl, username);
          profile = await this.userService.fetchUserProfile(user.id);
        } catch (e) {
          this.logger.error('auto-create profile failed', e);
        }
      }

      // Auto-logout banned users
      if (profile?.status === 'BANNED') {
        this.toast.showToast('Votre compte a été suspendu.', 'error');
        await this.logout();
        return;
      }

      // Compute role flags. Bootstrap UIDs grant SUPER_ADMIN exactly once
      // (then we persist the role into DB so subsequent sessions are DB-driven).
      const isBootstrap = BOOTSTRAP_SUPER_ADMIN_UIDS.includes(user.id);
      const dbRole = profile?.role;
      const isSuper = dbRole === 'SUPER_ADMIN' || isBootstrap;
      const isAdminFlag = isSuper || dbRole === 'ADMIN';

      if (isBootstrap && profile && profile.role !== 'SUPER_ADMIN') {
        try {
          await this.userService.updateUserProfile(user.id, { role: 'SUPER_ADMIN' });
          profile = { ...profile, role: 'SUPER_ADMIN' };
        } catch (e) {
          this.logger.warn('bootstrap role persist failed', e);
        }
      }

      this.isAdmin.set(isAdminFlag);
      this.isSuperAdmin.set(isSuper);

      this.userService.currentUserProfile.set(
        profile ? { ...profile, isAdmin: isAdminFlag } : null
      );

      this.userService.fetchPublicProfile(user.id)
        .then(p => this.userService.currentPublicProfile.set(p))
        .catch(e => this.logger.warn('fetchPublicProfile failed', e));

      this.isAuthReady.set(true);

      // Routing decision
      const currentUrl = this.router.url;
      if (!profile) {
        if (!currentUrl.includes('/onboarding')) {
          void this.router.navigate(['/onboarding']);
        }
      } else if (currentUrl.includes('/auth') || currentUrl.includes('/onboarding') || currentUrl === '/') {
        void this.router.navigate([isAdminFlag ? '/admin' : '/feed']);
      }
    } catch (e) {
      this.logger.error('handleUserChange', e);
      this.isAuthReady.set(true);
    }
  }

  async loginWithGoogle(): Promise<void> {
    const redirectUri = window.location.origin + '/auth/callback';
    const { data, error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, skipBrowserRedirect: true }
    });
    if (error) throw error;

    if (!data?.url) return;

    const popup = window.open(data.url, 'oauth_popup', 'width=600,height=700');
    if (!popup) {
      // Pop-up blocked: fall back to top-level redirect.
      window.location.href = data.url;
      return;
    }

    return new Promise<void>((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'OAUTH_AUTH_SUCCESS') return;
        window.removeEventListener('message', messageHandler);
        clearInterval(closedPoll);
        setTimeout(() => resolve(), 350);
      };
      window.addEventListener('message', messageHandler);
      // Watch for users closing the popup without authenticating.
      const closedPoll = setInterval(() => {
        if (popup.closed) {
          window.removeEventListener('message', messageHandler);
          clearInterval(closedPoll);
          resolve();
        }
      }, 500);
    });
  }

  async loginWithEmail(email: string, pass: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  }

  async signupWithEmail(email: string, pass: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({ email, password: pass });
    if (error) throw error;
    return data;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset-password',
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    // Wipe user-scoped local state *before* the auth state change fires
    // so the app re-renders against an empty profile, not the previous
    // user's leftovers.
    this.cleaner.purgeUserScope();
    await this.supabaseService.client.auth.signOut();
  }

  async deleteAccount(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      await this.userService.deleteUserProfile(user.id);
      this.logger.warn('Account hard-deletion requires a server-side Edge Function; client only purged local profile.');
      await this.supabaseService.client.auth.signOut();
    } catch (e) {
      this.logger.error('deleteAccount', e);
      throw e;
    }
  }
}
