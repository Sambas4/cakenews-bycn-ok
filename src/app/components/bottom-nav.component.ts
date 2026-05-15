import { Component, Input, output, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe transition-all duration-300">
      <div class="flex justify-around items-center h-[64px] px-2">
        @for (item of navItems; track item.id) {
          <button
            (click)="handleClick(item)"
            class="group relative flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-[0.97] transition-transform duration-100 outline-none cursor-pointer touch-manipulation"
          >
            <div class="relative p-1.5 rounded-2xl transition-all duration-300" [ngClass]="isActive(item.path) ? 'bg-white/10 translate-y-0' : 'bg-transparent translate-y-1'">
              <lucide-icon 
                [name]="item.icon" 
                class="w-6 h-6 transition-all duration-300" 
                [ngClass]="isActive(item.path) ? 'text-white fill-white/20' : 'text-zinc-600 group-hover:text-zinc-400'"
                [strokeWidth]="isActive(item.path) ? 2.5 : 2"
              ></lucide-icon>
              
              @if (item.id === 'messages' && hasNotification) {
                <span class="absolute top-0 right-0 w-3 h-3 bg-[#ff0000] border-2 border-black rounded-full z-10 animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.5)]"></span>
              }
            </div>

            <span class="text-[9px] font-[1000] uppercase tracking-widest transition-all duration-300" [ngClass]="isActive(item.path) ? 'text-white opacity-100 translate-y-0' : 'text-zinc-600 opacity-0 translate-y-2 absolute bottom-2'">
              {{ t()(item.labelKey, item.label) }}
            </span>

            <div class="absolute bottom-0 w-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#ff0000] to-transparent transition-opacity duration-300" [ngClass]="isActive(item.path) ? 'opacity-100' : 'opacity-0'"></div>
          </button>
        }
      </div>
    </nav>
  `
})
export class BottomNavComponent {
  @Input() hasNotification = false;
  homeClick = output<void>();

  private router = inject(Router);
  private location = inject(Location);
  private translation = inject(TranslationService);
  protected t = this.translation.t;

  navItems = [
    { id: 'home',     label: 'Accueil',  labelKey: 'NAV_HOME',     icon: 'home',           path: '/feed' },
    { id: 'search',   label: 'Explorer', labelKey: 'NAV_EXPLORE',  icon: 'search',         path: '/search' },
    { id: 'messages', label: 'Messages', labelKey: 'NAV_MESSAGES', icon: 'message-circle', path: '/messages' },
    { id: 'profile',  label: 'Profil',   labelKey: 'NAV_PROFILE',  icon: 'user',           path: '/profile' },
  ];

  isActive(path: string): boolean {
    const currentPath = this.location.path() || '/';
    if (path === '/feed') {
      return currentPath === '/feed' || currentPath.startsWith('/article/');
    }
    return currentPath.startsWith(path);
  }

  handleClick(item: any) {
    if (item.id === 'home') {
      const currentPath = this.location.path() || '/';
      if (currentPath === '/feed' || currentPath.startsWith('/article/')) {
        this.homeClick.emit();
        // If we are already in feed/article, we might want to navigate to feed to reset view
        if (currentPath !== '/feed') {
          this.router.navigate(['/feed']);
        }
      } else {
        this.router.navigate(['/feed']);
      }
    } else {
      this.router.navigate([item.path]);
    }
  }
}
