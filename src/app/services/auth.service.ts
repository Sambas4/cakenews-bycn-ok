import { Injectable, signal, inject } from '@angular/core';
import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { auth } from './firebase.service';
import { UserService } from './user.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userService = inject(UserService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isAuthReady = signal<boolean>(false);

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        let profile = await this.userService.fetchUserProfile(user.uid);
        
        // Handle developer override locally even if Firestore fetch fails
        if (user.email === 'mademagic3d@gmail.com') {
           if (!profile) {
              // Creating a fallback profile locally so the developer is not blocked by their own Firebase restrictions
              profile = {
                  uid: user.uid,
                  username: 'Admin',
                  avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Admin',
              };
           }
           profile.isAdmin = true;
        }

        this.userService.currentUserProfile.set(profile);
        this.isAuthReady.set(true);
        
        // Handle post-login redirection based on profile existence while respecting deep links
        const currentUrl = this.router.url;
        if (!profile) {
           if (!currentUrl.includes('/onboarding')) {
              this.router.navigate(['/onboarding']);
           }
        } else {
           if (currentUrl.includes('/auth') || currentUrl.includes('/onboarding') || currentUrl === '/') {
              this.router.navigate(['/feed']);
           }
        }
      } else {
         this.userService.currentUserProfile.set(null);
         this.isAuthReady.set(true);
         if (!this.router.url.includes('/auth')) {
            this.router.navigate(['/auth']);
         }
      }
    });
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Google Login Error:', e);
      throw e;
    }
  }

  async logout() {
    await signOut(auth);
  }

  async deleteAccount() {
    const user = auth.currentUser;
    if (user) {
      try {
        await this.userService.deleteUserProfile(user.uid);
        await deleteUser(user);
        // Assuming signing out and cleanup forms part of the Firebase listener automatically
      } catch (e) {
        console.error('Error deleting user:', e);
        throw e;
      }
    }
  }
}
