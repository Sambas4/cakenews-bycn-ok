import { Component, Input, output, inject, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import type { Article } from '../types';
import { InteractionService } from '../services/interaction.service';
import { ModalService } from '../services/modal.service';
import { DataService } from '../services/data.service';
import { ArticleCoverComponent } from './article/article-cover.component';
import { ReadingProgressBarComponent } from './article/reading-progress-bar.component';
import { DossierModuleComponent } from './modules/dossier.component';
import { RoomModuleComponent } from './modules/room.component';
import { ReseauModuleComponent } from './modules/reseau.component';
import { CATEGORY_COLORS } from '../constants';

type ArticleTab = 'dossier' | 'summary' | 'room' | 'reseau';

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    ArticleCoverComponent, 
    ReadingProgressBarComponent,
    DossierModuleComponent,
    RoomModuleComponent,
    ReseauModuleComponent
  ],
  template: `
    @if (isPreloading) {
      <div class="w-full h-full bg-black flex flex-col relative overflow-hidden">
         <app-article-cover 
           [imageUrl]="liveArticle()?.imageUrl || ''" 
           [title]="liveArticle()?.title || ''" 
           [articleId]="liveArticle()?.id || ''"
           [isActive]="false"
         ></app-article-cover>
         <div class="flex-1 bg-black p-8 opacity-20">
             <div class="h-8 bg-zinc-800 rounded w-3/4 mb-4"></div>
             <div class="h-4 bg-zinc-800 rounded w-full mb-2"></div>
             <div class="h-4 bg-zinc-800 rounded w-full mb-2"></div>
         </div>
      </div>
    } @else {
      <div class="w-full h-full relative bg-black overflow-hidden">
        <div 
          #verticalContainer
          (scroll)="handleScroll($event)"
          class="w-full h-full hide-scrollbar flex flex-col relative overflow-y-auto overflow-x-hidden pb-20"
          style="overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; touch-action: pan-y;"
        >
          <app-article-cover 
            [imageUrl]="liveArticle()?.imageUrl || ''" 
            [videoUrl]="liveArticle()?.videoUrl"
            [title]="liveArticle()?.title || ''" 
            [category]="liveArticle()?.category"
            [accentColor]="accentColor()"
            [articleId]="liveArticle()?.id || ''"
            [isActive]="isActive"
          ></app-article-cover>
          
          <div class="sticky top-0 z-[50] flex flex-col transform-gpu">
            <div class="bg-black/95 border-b border-white/5 pt-2 backdrop-blur-sm supports-[backdrop-filter]:bg-black/80">
              <div class="flex justify-around items-center">
                @for (tab of tabs; track tab.id) {
                  <button 
                    (click)="handleTabChange(tab.id)" 
                    class="flex flex-col items-center gap-1.5 py-4 transition-all duration-75 relative flex-1 active:scale-98 touch-manipulation cursor-pointer"
                    [ngClass]="activeTab === tab.id ? 'text-white' : 'text-white/20'"
                  >
                    <div class="relative">
                      <lucide-icon [name]="tab.icon" class="w-4 h-4"></lucide-icon>
                      @if (tab.id === 'room' && unreadInRoom() > 0) {
                        <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black animate-flash"></span>
                      }
                    </div>
                    <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{tab.label}}</span>
                    @if (activeTab === tab.id) {
                      <div class="absolute bottom-0 left-4 right-4 h-[2px]" [style.backgroundColor]="accentColor()"></div>
                    }
                  </button>
                }
              </div>
              @if (isActive && activeTab === 'dossier') {
                <app-reading-progress-bar [progress]="readProgress" [accentColor]="accentColor()"></app-reading-progress-bar>
              }
            </div>
          </div>

          <div class="flex-1 bg-black relative" [ngClass]="activeTab === 'room' ? 'p-0 pb-12' : 'px-6 pt-6 pb-6'">
            @if (activeTab === 'dossier') {
              <app-dossier-module [content]="liveArticle()?.content || []"></app-dossier-module>
            }
            @if (activeTab === 'summary') {
              <div class="flex flex-col gap-6">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-2 h-2 rounded-full" [style.backgroundColor]="accentColor()"></div>
                  <h3 class="text-xs font-black uppercase tracking-widest text-white/70">Résumé de l'audit</h3>
                </div>
                <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <p class="text-white/90 leading-relaxed text-lg font-serif">
                    {{ liveArticle()?.summary }}
                  </p>
                </div>
              </div>
            }
            @if (activeTab === 'room') {
              <app-room-module 
                [voices]="liveArticle()?.externalVoices || []" 
                [comments]="liveArticle()?.roomComments || []"
                [articleId]="liveArticle()?.id || ''"
                [accentColor]="accentColor()"
              ></app-room-module>
            }
            @if (activeTab === 'reseau') {
              <app-reseau-module 
                [article]="liveArticle()!"
                [accentColor]="accentColor()"
              ></app-reseau-module>
            }
            
            @if (activeTab === 'dossier') {
              <div class="mt-6 flex flex-col items-center w-full max-w-sm mx-auto">
                <div class="w-full flex flex-col items-center mb-6 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 shadow-xl">
                  <span class="text-[10px] font-black uppercase tracking-widest text-white/50 mb-6">Quel est votre Mood ?</span>
                  <div class="flex items-center justify-around w-full">
                    <button (click)="toggleVibe('choque')" class="flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation" [ngClass]="hasVibe('choque') ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
                      <span class="text-3xl filter drop-shadow-lg transition-transform" [ngClass]="hasVibe('choque') ? 'scale-125' : 'grayscale'">😲</span>
                      <span class="text-[10px] font-bold" [ngClass]="hasVibe('choque') ? 'text-white' : 'text-white/50'">{{liveArticle()?.vibeCheck?.choque || 0}}</span>
                    </button>
                    <button (click)="toggleVibe('sceptique')" class="flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation" [ngClass]="hasVibe('sceptique') ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
                      <span class="text-3xl filter drop-shadow-lg transition-transform" [ngClass]="hasVibe('sceptique') ? 'scale-125' : 'grayscale'">🤔</span>
                      <span class="text-[10px] font-bold" [ngClass]="hasVibe('sceptique') ? 'text-white' : 'text-white/50'">{{liveArticle()?.vibeCheck?.sceptique || 0}}</span>
                    </button>
                    <button (click)="toggleVibe('bullish')" class="flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation" [ngClass]="hasVibe('bullish') ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
                      <span class="text-3xl filter drop-shadow-lg transition-transform" [ngClass]="hasVibe('bullish') ? 'scale-125' : 'grayscale'">🚀</span>
                      <span class="text-[10px] font-bold" [ngClass]="hasVibe('bullish') ? 'text-white' : 'text-white/50'">{{liveArticle()?.vibeCheck?.bullish || 0}}</span>
                    </button>
                    <button (click)="toggleVibe('valide')" class="flex flex-col items-center gap-2 transition-all active:scale-95 touch-manipulation" [ngClass]="hasVibe('valide') ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
                      <span class="text-3xl filter drop-shadow-lg transition-transform" [ngClass]="hasVibe('valide') ? 'scale-125' : 'grayscale'">✅</span>
                      <span class="text-[10px] font-bold" [ngClass]="hasVibe('valide') ? 'text-white' : 'text-white/50'">{{liveArticle()?.vibeCheck?.valide || 0}}</span>
                    </button>
                  </div>
                </div>

                <button 
                  (click)="onNavigateNext.emit()" 
                  class="group flex flex-col items-center gap-3 active:scale-90 transition-all"
                >
                  <div class="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <lucide-icon name="arrow-down" class="w-6 h-6"></lucide-icon>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-all">Article Suivant</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Smart Action Bar -->
        <div class="absolute bottom-0 left-0 right-0 w-full z-[60]">
            <!-- Top Shadow -->
            <div class="h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
            
            <div class="w-full bg-black/95 backdrop-blur-xl border-t border-white/10 flex flex-col supports-[backdrop-filter]:bg-black/80">
                
                <!-- Actions Row -->
                <div class="grid grid-cols-5 w-full">
                    <!-- Like -->
                    <button (click)="toggleLike()" class="flex flex-col items-center justify-center py-3.5 gap-1.5 border-r border-white/5 last:border-r-0 transition-all outline-none touch-manipulation" [ngClass]="isLiked() ? 'bg-red-500/10' : 'hover:bg-white/5 active:bg-white/10'">
                        <lucide-icon name="heart" class="w-[22px] h-[22px] transition-transform" [ngClass]="isLiked() ? 'fill-red-500 text-red-500 scale-110' : 'text-white/60'"></lucide-icon>
                        <span class="text-[9px] font-bold tracking-wider" [ngClass]="isLiked() ? 'text-red-500' : 'text-white/40'">{{liveArticle()?.likes || 0}}</span>
                    </button>
                    
                    <!-- Room -->
                    <button (click)="handleTabChange('room')" class="flex flex-col items-center justify-center py-3.5 gap-1.5 border-r border-white/5 last:border-r-0 transition-all outline-none touch-manipulation" [ngClass]="activeTab === 'room' ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'">
                        <lucide-icon name="message-circle" class="w-[22px] h-[22px] transition-transform" [ngClass]="activeTab === 'room' ? 'text-white scale-110' : 'text-white/60'"></lucide-icon>
                        <span class="text-[9px] font-bold tracking-wider" [ngClass]="activeTab === 'room' ? 'text-white' : 'text-white/40'">{{liveArticle()?.roomComments?.length || 0}}</span>
                    </button>

                    <!-- Save -->
                    <button (click)="toggleSave()" class="flex flex-col items-center justify-center py-3.5 gap-1.5 border-r border-white/5 last:border-r-0 transition-all outline-none touch-manipulation" [ngClass]="isSaved() ? 'bg-emerald-500/10' : 'hover:bg-white/5 active:bg-white/10'">
                        <lucide-icon name="bookmark" class="w-[22px] h-[22px] transition-transform" [ngClass]="isSaved() ? 'fill-emerald-500 text-emerald-500 scale-110' : 'text-white/60'"></lucide-icon>
                        <span class="text-[9px] font-bold uppercase tracking-wider" [ngClass]="isSaved() ? 'text-emerald-500' : 'text-white/40'">Sauver</span>
                    </button>

                    <!-- Share -->
                    <button (click)="shareArticle()" class="flex flex-col items-center justify-center py-3.5 gap-1.5 border-r border-white/5 last:border-r-0 hover:bg-white/5 active:bg-white/10 transition-all outline-none touch-manipulation">
                        <lucide-icon name="share-2" class="w-[22px] h-[22px] text-white/60"></lucide-icon>
                        <span class="text-[9px] font-bold uppercase tracking-wider text-white/40">Partage</span>
                    </button>

                    <!-- More -->
                    <button (click)="openReportModal()" class="flex flex-col items-center justify-center py-3.5 gap-1.5 border-r border-white/5 last:border-r-0 hover:bg-white/5 active:bg-white/10 transition-all outline-none touch-manipulation">
                        <lucide-icon name="more-horizontal" class="w-[22px] h-[22px] text-white/60"></lucide-icon>
                        <span class="text-[9px] font-bold uppercase tracking-wider text-white/40">Plus</span>
                    </button>
                </div>

            </div>
        </div>
      </div>
    }
  `
})
export class ArticleCardComponent {
  @Input() article!: Article;
  @Input() isActive = false;
  @Input() isPreloading = false;
  @Input() navTarget: any = null;
  @Input() commentTrigger = 0;

  onRoomEnter = output<void>();
  onUnreadCommentsChange = output<number>();
  onNavigateNext = output<void>();

  @ViewChild('verticalContainer') verticalContainer!: ElementRef<HTMLDivElement>;

  private interaction = inject(InteractionService);
  private modal = inject(ModalService);
  private dataService = inject(DataService);

  activeTab: ArticleTab = 'dossier';
  readProgress = 0;

  tabs: {id: ArticleTab, label: string, icon: string}[] = [
    { id: 'dossier', label: 'Dossier', icon: 'layers' },
    { id: 'summary', label: 'Résumé', icon: 'align-left' },
    { id: 'room', label: 'Débats & Échos', icon: 'globe' },
    { id: 'reseau', label: 'Réseau', icon: 'bar-chart-3' }
  ];

  liveArticle = computed(() => {
    if (!this.article) return null;
    const all = this.dataService.articles();
    return all.find(a => a.id === this.article.id) || this.article;
  });

  accentColor = computed(() => {
    const article = this.liveArticle();
    if (!article) return '#ffffff';
    return article.isExclusive ? '#ff0000' : article.isSensitive ? '#ffcc00' : CATEGORY_COLORS[article.category];
  });

  unreadInRoom = computed(() => {
    if (!this.isActive || !this.liveArticle()) return 0;
    return 0; 
  });

  isLiked = computed(() => {
    const article = this.liveArticle();
    if (!article) return false;
    return this.interaction.isLiked(article.id);
  });

  isSaved = computed(() => {
    const article = this.liveArticle();
    if (!article) return false;
    return this.interaction.isSaved(article.id);
  });

  hasVibe(vibe: string): boolean {
    const article = this.liveArticle();
    if (!article) return false;
    return this.interaction.hasVibe(article.id, vibe);
  }

  toggleVibe(vibe: string) {
    const article = this.liveArticle();
    if (article) {
      this.interaction.toggleVibe(article.id, vibe);
    }
  }

  toggleLike() {
    const article = this.liveArticle();
    if (article) {
      this.interaction.toggleLike(article.id);
    }
  }

  toggleSave() {
    const article = this.liveArticle();
    if (article) {
      this.interaction.toggleSave(article.id);
    }
  }

  shareArticle() {
    const article = this.liveArticle();
    if (navigator.share && article) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href
      }).catch((err) => {
        // Ignore abort errors (user cancelled share)
        if (err.name !== 'AbortError' && !err.message?.includes('Share canceled') && !err.message?.includes('Share cancelled') && !err.message?.includes('aborted')) {
          console.error('Error sharing:', err);
        }
      });
    }
  }

  openReportModal() {
    const article = this.liveArticle();
    if (article) {
      this.modal.openModal('REPORT', { targetId: article.id, targetType: 'ARTICLE', targetTitle: article.title });
    }
  }

  handleScroll(e: Event) {
    if (!this.isActive || this.activeTab !== 'dossier') return;
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const totalHeight = scrollHeight - clientHeight;
    if (totalHeight > 0) {
      this.readProgress = scrollTop / totalHeight;
    }
  }

  handleTabChange(tab: ArticleTab) {
    this.activeTab = tab;
    if (this.verticalContainer) {
      const coverHeight = window.innerWidth;
      if (this.verticalContainer.nativeElement.scrollTop > coverHeight) {
        this.verticalContainer.nativeElement.scrollTo({ top: coverHeight, behavior: 'auto' });
      }
    }
    if (tab === 'room') {
      this.onRoomEnter.emit();
    }
  }
}
