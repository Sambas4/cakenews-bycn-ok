import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const unauthGuard: CanActivateFn = async () => {
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
  if (user) {
    const profile = userService.currentUserProfile();
    if (profile) {
      return router.parseUrl('/feed');
    } else {
      return router.parseUrl('/onboarding');
    }
  }

  return true;
};
