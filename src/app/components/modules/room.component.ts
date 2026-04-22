import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ExternalVoice, Comment } from '../../types';
import { InteractionService } from '../../services/interaction.service';
import { DataService } from '../../services/data.service';

type RoomTab = 'debates' | 'echoes';

@Component({
  selector: 'app-room-module',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Room Tabs -->
      <div class="flex border-b border-white/10 sticky top-[68px] bg-black/95 backdrop-blur-md z-40 px-4 pt-4">
        <button 
          (click)="activeTab.set('debates')"
          class="flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors relative"
          [ngClass]="activeTab() === 'debates' ? 'text-white' : 'text-white/40'"
        >
          Débats ({{comments.length}})
          @if (activeTab() === 'debates') {
            <div class="absolute bottom-0 left-0 right-0 h-0.5" [style.backgroundColor]="accentColor"></div>
          }
        </button>
        <button 
          (click)="activeTab.set('echoes')"
          class="flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors relative"
          [ngClass]="activeTab() === 'echoes' ? 'text-white' : 'text-white/40'"
        >
          Échos ({{voices.length}})
          @if (activeTab() === 'echoes') {
            <div class="absolute bottom-0 left-0 right-0 h-0.5" [style.backgroundColor]="accentColor"></div>
          }
        </button>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col relative hide-scrollbar">
        <!-- Debates Tab -->
        @if (activeTab() === 'debates') {
          <div class="flex-1 overflow-y-auto p-4 pb-0 flex flex-col hide-scrollbar">
            <div class="flex flex-col gap-4 pb-4">
              @if (comments.length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <lucide-icon name="message-square" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
                  <p class="text-sm font-medium">Aucun débat pour le moment. Lancez la discussion !</p>
                </div>
              } @else {
                @for (comment of comments; track comment.id) {
                  <div class="bg-zinc-900/40 rounded-xl p-4 flex gap-3">
                    <img [src]="comment.avatar" referrerpolicy="no-referrer" [alt]="comment.author" class="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div class="flex flex-col flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-bold text-white">{{comment.author}}</span>
                        <span class="text-[10px] text-white/40">{{comment.time}}</span>
                      </div>
                      @if (comment.replyTo) {
                        <div class="text-[10px] text-white/50 bg-white/5 border-l-2 p-1 pl-2 mb-1 rounded-r border-white/20 line-clamp-1">
                          <span class="font-bold">@{{comment.replyTo.author}}</span>: {{comment.replyTo.content}}
                        </div>
                      }
                      <p class="text-sm text-white/80 leading-relaxed">{{comment.content}}</p>
                      <div class="flex items-center gap-4 mt-3">
                        <button (click)="likeComment(comment.id)" class="flex items-center gap-1.5 transition-colors" [ngClass]="isCommentLiked(comment.id) ? 'text-red-500' : 'text-white/40 hover:text-white'">
                          <lucide-icon name="heart" class="w-3.5 h-3.5" [class.fill-red-500]="isCommentLiked(comment.id)"></lucide-icon>
                          <span class="text-xs">{{comment.likes || 0}}</span>
                        </button>
                        <button (click)="initReply(comment)" class="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
                          <lucide-icon name="message-circle" class="w-3.5 h-3.5"></lucide-icon>
                          <span class="text-xs">Répondre</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
          
          <!-- Comment Input -->
          <div class="shrink-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent sticky bottom-0 left-0 right-0 z-50 pt-8 mt-auto border-t border-black">
            @if (replyingTo) {
               <div class="flex items-center justify-between bg-zinc-800 rounded-t-xl px-4 py-2 border-b border-white/10">
                 <span class="text-xs font-bold text-white/60 truncate">En réponse à {{replyingTo.author}}...</span>
                 <button (click)="cancelReply()" class="text-white/40 hover:text-white"><lucide-icon name="x" class="w-3 h-3"></lucide-icon></button>
               </div>
            }
            <div class="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md p-1 pl-4 border border-white/10" [ngClass]="replyingTo ? 'rounded-b-2xl' : 'rounded-full'">
              <input 
                type="text" 
                [(ngModel)]="newCommentText"
                (keyup.enter)="postComment()"
                [placeholder]="replyingTo ? 'Votre réponse...' : 'Participer au débat...'" 
                class="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/40"
              />
              <button 
                (click)="postComment()"
                [disabled]="!newCommentText.trim()"
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-50" 
                [style.backgroundColor]="accentColor"
              >
                <lucide-icon name="send" class="w-4 h-4 text-black"></lucide-icon>
              </button>
            </div>
          </div>
        }

        <!-- Echoes Tab -->
        @if (activeTab() === 'echoes') {
          <div class="flex-1 overflow-y-auto p-4 hide-scrollbar">
            <div class="flex flex-col gap-4">
              @if (voices.length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <lucide-icon name="mic-off" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
                  <p class="text-sm font-medium">Aucun écho pour le moment.</p>
                </div>
              } @else {
                @for (voice of voices; track voice.id) {
                  <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <img [src]="voice.avatar" referrerpolicy="no-referrer" [alt]="voice.author" class="w-8 h-8 rounded-full object-cover" />
                        <div class="flex flex-col">
                          <span class="text-sm font-bold text-white">{{voice.author}}</span>
                          <span class="text-[10px] uppercase tracking-wider text-white/50">{{voice.source}}</span>
                        </div>
                      </div>
                      <div class="p-2 rounded-full bg-black/50 text-white/70">
                        @if (voice.type === 'tweet') { <lucide-icon name="twitter" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'audio') { <lucide-icon name="mic" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'video') { <lucide-icon name="video" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'text') { <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon> }
                      </div>
                    </div>
                    
                    @if (voice.title) {
                      <h4 class="text-base font-bold text-white leading-tight">{{voice.title}}</h4>
                    }
                    
                    <p class="text-sm text-white/80 leading-relaxed line-clamp-3">{{voice.content}}</p>
                    
                    <a [href]="voice.url" target="_blank" class="text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1 hover:underline w-fit" [style.color]="accentColor">
                      Lire l'article <lucide-icon name="external-link" class="w-3 h-3"></lucide-icon>
                    </a>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class RoomModuleComponent {
  @Input() articleId!: string;
  @Input() voices: ExternalVoice[] = [];
  @Input() comments: Comment[] = [];
  @Input() accentColor: string = '#ffffff';

  private interaction = inject(InteractionService);
  private dataService = inject(DataService);

  activeTab = signal<RoomTab>('debates');
  newCommentText = '';
  replyingTo: Comment | null = null;
  likedComments = new Set<string>();

  initReply(comment: Comment) {
    this.replyingTo = comment;
  }

  cancelReply() {
    this.replyingTo = null;
  }

  isCommentLiked(commentId: string): boolean {
    return this.likedComments.has(commentId);
  }

  likeComment(commentId: string) {
    // Local toggle
    if (this.likedComments.has(commentId)) {
        this.likedComments.delete(commentId);
    } else {
        this.likedComments.add(commentId);
    }
    
    // Update article state
    const articles = this.dataService.articles();
    const article = articles.find(a => a.id === this.articleId);
    if (article) {
       const updatedComments = this.comments.map(c => {
         if (c.id === commentId) {
            const isLike = this.likedComments.has(commentId);
            return { ...c, likes: (c.likes || 0) + (isLike ? 1 : -1) };
         }
         return c;
       });
       this.dataService.upsertArticle({ ...article, roomComments: updatedComments });
    }
  }

  postComment() {
    if (!this.newCommentText.trim() || !this.articleId) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      author: 'Vous',
      avatar: 'https://ui-avatars.com/api/?name=Vous&background=random',
      time: 'À l\'instant',
      content: this.newCommentText.trim(),
      likes: 0
    };

    if (this.replyingTo) {
      newComment.replyTo = {
        author: this.replyingTo.author,
        content: this.replyingTo.content
      };
    }

    // Sauvegarde en base localement
    const articles = this.dataService.articles();
    const article = articles.find(a => a.id === this.articleId);
    if (article) {
       const updatedComments = [...(article.roomComments || []), newComment];
       this.dataService.upsertArticle({ ...article, roomComments: updatedComments });
    }

    this.newCommentText = '';
    this.replyingTo = null;
    
    // MàJ Statut Utilisateur
    this.interaction.logComment(this.articleId);
  }
}
