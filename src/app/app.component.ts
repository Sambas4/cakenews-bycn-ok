import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BottomNavComponent } from './components/bottom-nav.component';
import { VibeTickerComponent } from './components/ui/vibe-ticker.component';
import { GlobalModalRegistryComponent } from './components/global-modal-registry.component';
import { AuthService } from './services/auth.service';
import { MotionPreferenceService } from './services/motion-preference.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    BottomNavComponent, 
    VibeTickerComponent,
    GlobalModalRegistryComponent
  ],
  template: `
    <div class="h-[100dvh] w-full bg-black text-white flex flex-col font-sans overflow-hidden relative">
      @if (authService.isAuthReady()) {
        <!-- Vibe Ticker (Top) -->
        @if (showTicker) {
          <app-vibe-ticker></app-vibe-ticker>
        }

        <!-- Main Content Area -->
        <div class="flex-1 relative overflow-hidden" [ngClass]="{'pb-[calc(64px+env(safe-area-inset-bottom))]': showBottomNav}">
          <router-outlet></router-outlet>
        </div>

        <!-- Bottom Navigation -->
        @if (showBottomNav) {
          <app-bottom-nav></app-bottom-nav>
        }

        <!-- Global Modals -->
        <app-global-modal-registry></app-global-modal-registry>
      } @else {
        <!-- Loading initial de l'application -->
        <div class="w-full h-full flex items-center justify-center bg-black">
          <div class="animate-pulse w-12 h-12 rounded-xl bg-white/10"></div>
        </div>
      }
    </div>
  `
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);
  // Eager inject so the constructor wires the prefers-reduced-motion
  // listener and applies the resolved CSS class on the very first paint.
  private motion = inject(MotionPreferenceService);
  
  showBottomNav = false;
  showTicker = false;

  ngOnInit() {
    // Check initial URL without waiting for event
    this.updateUIForUrl(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateUIForUrl(event.urlAfterRedirects);
    });
  }

  private updateUIForUrl(url: string) {
    if (url.startsWith('/auth') || url.startsWith('/admin') || url.startsWith('/onboarding') || url === '/') {
      this.showBottomNav = false;
      this.showTicker = false;
    } else {
      this.showBottomNav = true;
      this.showTicker = true;
    }
  }
}
