import { Routes } from '@angular/router';
import { FeedViewComponent } from './views/feed.component';
import { AuthViewComponent } from './views/auth.component';
import { OnboardingViewComponent } from './views/onboarding.component';
import { ProfileViewComponent } from './views/profile.component';
import { MessagesViewComponent } from './views/messages.component';
import { AdminViewComponent } from './components/admin/admin-view.component';
import { SearchViewComponent } from './views/search.component';
import { StatsViewComponent } from './views/stats.component';
import { authGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { unauthGuard } from './guards/unauth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'feed', component: FeedViewComponent, canActivate: [authGuard] },
  { path: 'article/:id', component: FeedViewComponent, canActivate: [authGuard] },
  { path: 'search', component: SearchViewComponent, canActivate: [authGuard] },
  { path: 'messages', component: MessagesViewComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileViewComponent, canActivate: [authGuard] },
  { path: 'stats', component: StatsViewComponent, canActivate: [authGuard] },
  { path: 'auth', component: AuthViewComponent, canActivate: [unauthGuard] },
  { path: 'onboarding', component: OnboardingViewComponent, canActivate: [onboardingGuard] },
  { path: 'admin', component: AdminViewComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'auth' }
];
