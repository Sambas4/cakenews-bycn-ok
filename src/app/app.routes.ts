import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { unauthGuard } from './guards/unauth.guard';
import { adminGuard } from './guards/admin.guard';

/**
 * Routing strategy:
 *  - The auth shell is eagerly loaded (it's the entry point).
 *  - The feed renders the article card which is the hot path; we keep
 *    it eager so the very first interaction is instant.
 *  - The admin studio, profile, search, messaging and onboarding views
 *    are lazy-loaded — most users never visit the admin pages and we
 *    do not want to ship them in the critical bundle.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },

  {
    path: 'auth',
    canActivate: [unauthGuard],
    loadComponent: () => import('./views/auth.component').then(m => m.AuthViewComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./views/auth-callback.component').then(m => m.AuthCallbackComponent),
  },

  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () => import('./views/feed.component').then(m => m.FeedViewComponent),
  },
  {
    path: 'article/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./views/feed.component').then(m => m.FeedViewComponent),
  },

  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () => import('./views/search.component').then(m => m.SearchViewComponent),
  },
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () => import('./views/messages.component').then(m => m.MessagesViewComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./views/profile.component').then(m => m.ProfileViewComponent),
  },

  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./views/onboarding.component').then(m => m.OnboardingViewComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/admin/admin-view.component').then(m => m.AdminViewComponent),
  },

  { path: '**', redirectTo: 'auth' },
];
