import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DataService } from '../services/data.service';
import { InteractionService } from '../services/interaction.service';
import { TranslationService } from '../services/translation.service';
import { FeedEngineService } from '../services/feed-engine.service';
import { ArticleCardComponent } from '../components/article-card.component';
import { Article, Category } from '../types';
import { THEME_GROUPS, CATEGORY_COLORS } from '../constants';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-feed-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ArticleCardComponent],
  template: `
    @if (articles().length === 0) {
      <div class="w-full h-full bg-black relative z-[200] flex items-center justify-center">
        <div class="text-white/50 text-center">
          <lucide-icon name="archive" class="w-16 h-16 mb-4 opacity-50 mx-auto"></lucide-icon>
          <p class="text-sm font-bold uppercase tracking-widest">Aucun article disponible</p>
        </div>
      </div>
    } @else {
      <div 
        #container
        class="w-full h-full bg-black overflow-hidden relative"
        style="touch-action: pan-y;"
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd($event)"
        (touchcancel)="onTouchEnd($event)"
      >
        <div 
          #track
          class="h-full flex will-change-transform"
          [style.width]="(articles().length > 0 ? articles().length * 100 : 100) + '%'"
          [style.transform]="'translate3d(' + (-currentIndex * containerWidth) + 'px, 0, 0)'"
          style="transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);"
        >
          @for (article of articles(); track article.id; let i = $index) {
            <div class="h-full relative" [style.width]="(100 / articles().length) + '%'">
              @if (Math.abs(currentIndex - i) <= 1) {
                <app-article-card 
                  [article]="article"
                  [isActive]="i === currentIndex"
                  [isPreloading]="i !== currentIndex"
                  (onNavigateNext)="handleNavigateNext()"
                ></app-article-card>
              } @else {
                <div class="w-full h-full bg-black"></div>
              }
            </div>
          }
        </div>
      </div>
    }
  `
})
export class FeedViewComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private interaction = inject(InteractionService);
  private translation = inject(TranslationService);
  private feedEngine = inject(FeedEngineService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  t = this.translation.t;
  Math = Math;

  // L'état du feed (isolé de la réactivité continue brute pour ne pas recréer le DOM à chaque micro-signal)
  feedArticles = computed(() => {
    // This allows the feed to automatically reflect new likes/comments from snapshot 
    // while keeping the order stable based on FeedEngine rules.
    const allArticles = this.dataService.articles();
    return this.feedEngine.generateAdaptiveFeed(allArticles);
  });
  
  articles = this.feedArticles;
  
  currentIndex = 0;
  containerWidth = window.innerWidth;

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  physics = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    startTime: 0,
    initialTranslate: 0,
    isLockedVertical: false,
    isLockedHorizontal: false,
  };

  private routerSub: any;
  private viewStartTime: number = Date.now();

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && this.articles().length > 0) {
        const index = this.articles().findIndex((a: Article) => a.id === id);
        if (index >= 0 && index !== this.currentIndex) {
          this.currentIndex = index;
        }
      } else {
        this.currentIndex = 0;
      }
    });

    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url === '/feed' || event.urlAfterRedirects === '/feed') {
        this.currentIndex = 0;
        if (this.trackRef) {
          this.trackRef.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
          this.trackRef.nativeElement.style.transform = `translate3d(0px, 0, 0)`;
        }
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (this.containerRef) {
      this.containerWidth = this.containerRef.nativeElement.clientWidth;
    }
  }

  ngOnDestroy() {
    this.logCurrentDwellTime(); // Enregistrer le temps passé sur l'article en cours à la fermeture
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  // --- LOGIC DE CHRONOMÈTRAGE (MICRO SIGNAUX) ---
  logCurrentDwellTime() {
    const article = this.articles()[this.currentIndex];
    if (article && this.viewStartTime > 0) {
      const durationMs = Date.now() - this.viewStartTime;
      this.interaction.logSessionRead(article.id, durationMs);
    }
  }

  handleNavigateNext() {
    this.currentIndex = Math.min(this.currentIndex + 1, this.articles().length - 1);
    this.updateRoute();
  }

  updateRoute() {
    const article = this.articles()[this.currentIndex];
    if (article) {
      this.router.navigate(['/article', article.id], { replaceUrl: true });
      this.interaction.markAsRead(article.id);
    }
  }

  onTouchStart(e: TouchEvent) {
    this.physics.isDragging = true;
    this.physics.startX = e.touches[0].clientX;
    this.physics.startY = e.touches[0].clientY;
    this.physics.currentX = e.touches[0].clientX;
    this.physics.startTime = Date.now();
    this.physics.isLockedVertical = false;
    this.physics.isLockedHorizontal = false;
    
    if (this.trackRef) {
        this.trackRef.nativeElement.style.transition = 'none';
        this.physics.initialTranslate = -this.currentIndex * this.containerWidth;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.physics.isDragging) return;

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - this.physics.startX;
    const dy = y - this.physics.startY;

    if (!this.physics.isLockedHorizontal && !this.physics.isLockedVertical) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.physics.isLockedHorizontal = true;
            } else {
                this.physics.isLockedVertical = true;
                this.physics.isDragging = false; 
                return;
            }
        }
    }

    if (this.physics.isLockedHorizontal) {
        if (e.cancelable) e.preventDefault();
        this.physics.currentX = x;
        if (this.trackRef) {
            let effectiveDx = dx;
            if ((this.currentIndex === 0 && dx > 0) || (this.currentIndex === this.articles().length - 1 && dx < 0)) {
                effectiveDx = dx * 0.3;
            }
            const pxTranslate = this.physics.initialTranslate + effectiveDx;
            this.trackRef.nativeElement.style.transform = `translate3d(${pxTranslate}px, 0, 0)`;
        }
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (!this.physics.isDragging || !this.physics.isLockedHorizontal) {
        this.physics.isDragging = false;
        return;
    }

    const dx = this.physics.currentX - this.physics.startX;
    const dt = Date.now() - this.physics.startTime;
    const width = this.containerWidth;
    
    const isQuickSwipe = dt < 300 && Math.abs(dx) > 50;
    const isLongSwipe = Math.abs(dx) > width * 0.4;

    let newIndex = this.currentIndex;

    if ((isQuickSwipe || isLongSwipe)) {
        if (dx < 0 && this.currentIndex < this.articles().length - 1) {
            newIndex = this.currentIndex + 1;
        } else if (dx > 0 && this.currentIndex > 0) {
            newIndex = this.currentIndex - 1;
        }
    }

    if (this.trackRef) {
        this.trackRef.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        this.trackRef.nativeElement.style.transform = `translate3d(${-newIndex * width}px, 0, 0)`;
    }

    if (newIndex !== this.currentIndex) {
        this.logCurrentDwellTime(); // L'utilisateur vient de swiper : on enregistre combien de temps il est resté
        this.currentIndex = newIndex;
        this.viewStartTime = Date.now(); // Reset du chrono pour le nouvel article
        this.updateRoute();
    }

    this.physics.isDragging = false;
    this.physics.isLockedHorizontal = false;
  }
}
