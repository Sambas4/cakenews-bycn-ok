import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-article-cover',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (error && !videoUrl) {
      <div class="relative w-full aspect-square flex-shrink-0 bg-zinc-900 overflow-hidden flex flex-col items-center justify-center border-b border-white/5">
         <lucide-icon name="image-off" class="w-12 h-12 text-white/10 mb-4"></lucide-icon>
         <span class="text-white/20 font-black uppercase tracking-widest text-[10px]">Média Non Disponible</span>
      </div>
    } @else {
      <div class="relative w-full aspect-square flex-shrink-0 bg-black overflow-hidden select-none touch-manipulation cursor-pointer" style="contain: strict;" (click)="handleTap($event)">
        @if (videoUrl) {
          <video
            [src]="videoUrl"
            class="w-full h-full object-cover object-center"
            autoplay
            loop
            muted
            playsinline
            [poster]="optimizedUrl()"
            (error)="handleError()"
          ></video>
        } @else {
          <img 
              [src]="optimizedUrl()" 
              referrerpolicy="no-referrer"
              [alt]="title" 
              (error)="handleError()"
              class="w-full h-full object-cover object-center block"
              loading="eager"
              decoding="sync" 
          />
        }

        <div class="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
        <div class="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end">
           @if (category) {
             <div class="flex items-center gap-2 mb-2">
               <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-black flex items-center justify-center" [style.backgroundColor]="accentColor">{{category}}</span>
             </div>
           }
           <h1 class="text-2xl font-bold text-white leading-tight drop-shadow-lg" style="text-wrap: balance;">{{title}}</h1>
        </div>

        @if (showHeart) {
          <div class="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
             <lucide-icon name="heart" class="w-32 h-32 text-white fill-white drop-shadow-2xl"></lucide-icon>
          </div>
        }
      </div>
    }
  `
})
export class ArticleCoverComponent {
  @Input() imageUrl = '';
  @Input() videoUrl?: string;
  @Input() title = '';
  @Input() category?: string;
  @Input() accentColor?: string;
  @Input() articleId = '';
  @Input() isActive = false;

  private interaction = inject(InteractionService);

  error = false;
  showHeart = false;
  lastTap = 0;

  optimizedUrl = computed(() => {
    if (!this.imageUrl || !this.imageUrl.includes('unsplash.com')) return this.imageUrl;
    try {
      const url = new URL(this.imageUrl);
      url.searchParams.delete('w'); url.searchParams.delete('q'); url.searchParams.delete('fm');
      url.searchParams.set('w', '1080'); 
      url.searchParams.set('h', '1080');
      url.searchParams.set('q', '80');
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('fit', 'crop');
      return url.toString();
    } catch (e) {
      return this.imageUrl;
    }
  });

  handleError() {
    if (this.optimizedUrl()) this.error = true;
  }

  handleTap(e: MouseEvent | TouchEvent) {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - this.lastTap < DOUBLE_TAP_DELAY) {
      e.stopPropagation();
      if (!this.interaction.isLiked(this.articleId)) {
        this.interaction.toggleLike(this.articleId);
      }
      this.showHeart = true;
      setTimeout(() => this.showHeart = false, 800);
    }
    this.lastTap = now;
  }
}
