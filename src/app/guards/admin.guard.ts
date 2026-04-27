import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  if (!authService.isAuthReady()) {
     await new Promise<void>(resolve => {
        const interval = setInterval(() => {
           if (authService.isAuthReady()) {
              clearInterval(interval);
              resolve();
           }
        }, 50);
     });
  }

  const user = authService.currentUser();
  if (!user) {
    return router.parseUrl('/auth');
  }

  // Bypass pour le développeur
  if (user.email === 'mademagic3d@gmail.com') {
    return true;
  }

  const profile = userService.currentUserProfile();
  if (!profile && !authService.isSuperAdmin() && !authService.isAdmin() && user.email !== 'mademagic3d@gmail.com') {
    return router.parseUrl('/onboarding');
  }

  if (authService.isAdmin() || authService.isSuperAdmin()) {
    return true;
  } else {
    // Dans l'iframe, alert() bloque l'UI. On redirige silencieusement.
    return router.parseUrl('/feed');
  }
};
