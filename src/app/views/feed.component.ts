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
    @if (articles().length === 0 || showConfig) {
      <div class="w-full h-full bg-black relative z-[200]">
         <!-- FeedConfigurator -->
         <div class="w-full h-full flex flex-col bg-zinc-950 pb-safe relative">
            <div class="p-6 pt-12 pb-4 bg-black border-b border-zinc-800 sticky top-0 z-10 flex items-center justify-between shadow-xl">
                <div>
                    <h3 class="text-2xl font-[1000] uppercase text-white tracking-tighter">{{t()('FEED_CONFIG_TITLE', 'Votre Algorithme')}}</h3>
                    <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                        {{t()('FEED_CONFIG_SUB', 'Définissez vos propres règles. Zéro tabou.')}}
                    </p>
                </div>
                @if (articles().length > 0) {
                  <button (click)="showConfig = false" class="p-2 bg-zinc-900 rounded-full text-white">
                    <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
                  </button>
                }
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-10">
               <!-- Categories -->
               @for (group of themeGroups; track group.key) {
                 @if (group.key !== 'SENSITIVE') {
                   <div>
                     <div class="flex items-center gap-2 mb-4 text-zinc-400">
                         <lucide-icon [name]="group.icon" class="w-4 h-4"></lucide-icon>
                         <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{t()('GROUP_' + group.key, group.label)}}</span>
                     </div>
                     <div class="grid grid-cols-2 gap-2">
                        @for (cat of group.categories; track cat) {
                          <button
                            (click)="toggleUserInterest(cat)"
                            class="h-12 px-3 font-[1000] uppercase text-[10px] border transition-all flex items-center justify-between rounded-lg active:scale-[0.98] duration-75 touch-manipulation cursor-pointer"
                            [ngClass]="isInterested(cat) ? 'bg-white text-black border-transparent shadow-lg scale-[1.02]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'"
                          >
                            <span class="truncate mr-2">{{t()('CAT_' + cat, cat)}}</span>
                            <div class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="isInterested(cat) ? 'bg-black' : 'bg-zinc-700'" [style.backgroundColor]="isInterested(cat) ? getCategoryColor(cat) : undefined"></div>
                          </button>
                        }
                     </div>
                   </div>
                 }
               }
            </div>
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
        <div class="absolute top-4 right-4 z-50">
            <button 
                (click)="showConfig = true"
                class="p-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-black/70 transition-all active:scale-95 shadow-lg group"
            >
                <lucide-icon name="sliders-horizontal" class="w-5 h-5 group-hover:rotate-180 transition-transform duration-500"></lucide-icon>
            </button>
        </div>

        <div 
          #track
          class="h-full flex will-change-transform"
          [style.width]="(articles().length > 0 ? articles().length * 100 : 100) + '%'"
          [style.transform]="'translate3d(' + (-currentIndex * containerWidth) + 'px, 0, 0)'"
          style="transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);"
        >
          @if (articles().length === 0) {
            <div class="w-full h-full flex flex-col items-center justify-center text-white/50">
              <lucide-icon name="archive" class="w-16 h-16 mb-4 opacity-50"></lucide-icon>
              <p class="text-sm font-bold uppercase tracking-widest">Aucun article disponible</p>
            </div>
          }
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

  // L'état du feed (isolé de la réactivité continue pour ne pas recréer le DOM à chaque micro-signal)
  feedArticles = signal<Article[]>([]);
  articles = computed(() => this.feedArticles());
  
  currentIndex = 0;
  containerWidth = window.innerWidth;
  showConfig = false;

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  themeGroups = Object.entries(THEME_GROUPS).map(([key, categories]) => {
    let icon = 'target';
    if (key === 'ACTUALITES') icon = 'monitor';
    if (key === 'FUTUR') icon = 'zap';
    if (key === 'LIFESTYLE') icon = 'heart';
    if (key === 'ADRENALINE') icon = 'flame';
    return { key, label: key, icon, categories };
  });

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
    // Génération "Snapshot" du feed au démarrage de la vue
    this.feedArticles.set(this.feedEngine.generateAdaptiveFeed(this.dataService.articles()));

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

  isInterested(cat: Category) {
    return this.interaction.userInterests().includes(cat);
  }

  toggleUserInterest(cat: Category) {
    this.interaction.toggleUserInterest(cat);
  }

  getCategoryColor(cat: Category) {
    return CATEGORY_COLORS[cat];
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
