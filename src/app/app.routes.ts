import { Routes } from '@angular/router';
import { FeedViewComponent } from './views/feed.component';
import { AuthViewComponent } from './views/auth.component';
import { ProfileViewComponent } from './views/profile.component';
import { MessagesViewComponent } from './views/messages.component';
import { AdminViewComponent } from './components/admin/admin-view.component';
import { SearchViewComponent } from './views/search.component';
import { StatsViewComponent } from './views/stats.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'feed', component: FeedViewComponent },
  { path: 'article/:id', component: FeedViewComponent },
  { path: 'search', component: SearchViewComponent },
  { path: 'messages', component: MessagesViewComponent },
  { path: 'profile', component: ProfileViewComponent },
  { path: 'stats', component: StatsViewComponent },
  { path: 'auth', component: AuthViewComponent },
  { path: 'admin', component: AdminViewComponent },
  { path: '**', redirectTo: 'auth' }
];
