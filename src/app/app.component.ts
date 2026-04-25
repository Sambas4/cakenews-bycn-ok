import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BottomNavComponent } from './components/bottom-nav.component';
import { VibeTickerComponent } from './components/ui/vibe-ticker.component';
import { GlobalModalRegistryComponent } from './components/global-modal-registry.component';

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
    </div>
  `
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  
  showBottomNav = true;
  showTicker = true;

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      // Hide bottom nav and ticker on auth, onboarding, and admin pages
      if (url.startsWith('/auth') || url.startsWith('/admin') || url.startsWith('/onboarding')) {
        this.showBottomNav = false;
        this.showTicker = false;
      } else {
        this.showBottomNav = true;
        this.showTicker = true;
      }
    });
  }
}
