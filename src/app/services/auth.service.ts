import { Injectable, signal, inject } from '@angular/core';
import { UserService } from './user.service';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userService = inject(UserService);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  currentUser = signal<User | null>(null);
  isAuthReady = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  isSuperAdmin = signal<boolean>(false);

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    await this.handleUserChange(session?.user || null);

    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        await this.handleUserChange(session?.user || null);
      }
    });
  }

  private async handleUserChange(user: User | null) {
    this.currentUser.set(user);
    if (user) {
      try {
        // Mock custom claims using metadata or a specific table if needed
        // For Supabase, usually user.app_metadata or checking a specific role table
        let isAdminClaim = false;
        let isSuperAdminClaim = false;

        this.isAdmin.set(isAdminClaim);
        this.isSuperAdmin.set(isSuperAdminClaim);

        const isDeveloperFallback = (user.email === 'mademagic3d@gmail.com');

        let profile = await this.userService.fetchUserProfile(user.id);
        
        if (isDeveloperFallback && !profile) {
           isAdminClaim = true;
           isSuperAdminClaim = true;
           this.isAdmin.set(true);
           this.isSuperAdmin.set(true);

           const adminProfile = {
               uid: user.id,
               email: user.email || '',
               displayName: 'Admin',
               photoURL: 'https://api.dicebear.com/7.x/notionists/svg?seed=Admin',
               username: 'admin',
               status: 'ACTIVE' as const
           };
           this.userService.currentUserProfile.set(adminProfile);
           // Fallback creation disabled for Supabase until explicitly saved
        } else {
           this.userService.currentUserProfile.set(profile);
        }

        this.userService.fetchPublicProfile(user.id).then(publicProfile => {
            this.userService.currentPublicProfile.set(publicProfile);
        }).catch(e => console.warn(e));

        this.isAuthReady.set(true);
        
        const currentUrl = this.router.url;
        if (!profile && !isDeveloperFallback) {
           if (!currentUrl.includes('/onboarding')) {
              this.router.navigate(['/onboarding']);
           }
        } else {
           if (currentUrl.includes('/auth') || currentUrl.includes('/onboarding') || currentUrl === '/') {
              if (isAdminClaim || isSuperAdminClaim || isDeveloperFallback) {
                 this.router.navigate(['/admin']);
              } else {
                 this.router.navigate(['/feed']);
              }
           }
        }
      } catch (e) {
          console.error("Auth initialization error:", e);
          this.isAuthReady.set(true);
      }
    } else {
       this.userService.currentUserProfile.set(null);
       this.userService.currentPublicProfile.set(null);
       this.isAuthReady.set(true);
       this.isAdmin.set(false);
       this.isSuperAdmin.set(false);

       if (!this.router.url.includes('/auth')) {
          this.router.navigate(['/auth']);
       }
    }
  }

  async loginWithGoogle() {
    try {
      const redirectUri = window.location.origin + '/auth/callback';
      const { data, error } = await this.supabaseService.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      
      if (data?.url) {
         window.open(data.url, 'oauth_popup', 'width=600,height=700');
         
         // Setup listener for completion
         return new Promise<void>((resolve, reject) => {
             const messageHandler = (event: MessageEvent) => {
                 if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                     window.removeEventListener('message', messageHandler);
                     // Allow a brief moment for the auth state change to be processed by Supabase
                     setTimeout(() => resolve(), 500); 
                 }
             };
             window.addEventListener('message', messageHandler);
         });
      }
    } catch (e) {
      console.error('Google Login Error:', e);
      throw e;
    }
  }

  async logout() {
    await this.supabaseService.client.auth.signOut();
  }

  async deleteAccount() {
    const user = this.currentUser();
    if (user) {
      try {
        await this.userService.deleteUserProfile(user.id);
        // Supabase client can't easily delete user account without admin keys.
        // It's typically done server-side or via an Edge Function
        console.warn("User deletion from Supabase requires Edge Function or admin token.");
        await this.supabaseService.client.auth.signOut();
      } catch (e) {
        console.error('Error deleting user:', e);
        throw e;
      }
    }
  }
}
