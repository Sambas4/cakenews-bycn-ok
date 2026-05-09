import { Component, Input, OnChanges, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ExternalVoice, Comment } from '../../types';
import { InteractionService } from '../../services/interaction.service';
import { CommentService } from '../../services/comment.service';

type RoomTab = 'debates' | 'echoes';

/**
 * Article "Room" — community debates + curated external voices.
 *
 * Comments live in the dedicated `article_comments` table and are
 * fetched lazily through {@link CommentService}, so swiping back to
 * a previously-opened article is instant (cache hit) and a brand-new
 * article triggers a single network round-trip.
 *
 * Posting is fully optimistic: the placeholder appears the moment the
 * user taps Send, then is reconciled with the canonical row from the
 * RPC. A failed post drops the placeholder and surfaces a toast.
 *
 * The legacy `comments` input is kept for backward compatibility with
 * existing call-sites that pass an empty array; it acts as a fallback
 * until the cache hydrates from the API.
 */
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
          Débats ({{ visibleComments().length }})
          @if (activeTab() === 'debates') {
            <div class="absolute bottom-0 left-0 right-0 h-0.5" [style.backgroundColor]="accentColor"></div>
          }
        </button>
        <button
          (click)="activeTab.set('echoes')"
          class="flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors relative"
          [ngClass]="activeTab() === 'echoes' ? 'text-white' : 'text-white/40'"
        >
          Échos ({{ voices.length }})
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
              @if (loading()) {
                <div class="flex flex-col items-center justify-center py-8 text-zinc-600">
                  <div class="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/60 animate-spin mb-3" aria-hidden="true"></div>
                  <p class="text-[11px] font-bold uppercase tracking-widest">Chargement</p>
                </div>
              } @else if (visibleComments().length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <lucide-icon name="message-square" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
                  <p class="text-sm font-medium">Aucun débat pour le moment. Lance la discussion !</p>
                </div>
              } @else {
                @for (comment of visibleComments(); track comment.id) {
                  <div class="bg-zinc-900/40 rounded-xl p-4 flex gap-3 transition-opacity"
                       [class.opacity-70]="isPending(comment.id)">
                    <img [src]="comment.avatar" referrerpolicy="no-referrer" [alt]="comment.author" loading="lazy"
                      class="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div class="flex flex-col flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-bold text-white truncate">{{ comment.author }}</span>
                        <span class="text-[10px] text-white/40 shrink-0 ml-2">
                          {{ isPending(comment.id) ? 'envoi…' : comment.time }}
                        </span>
                      </div>
                      @if (comment.replyTo) {
                        <div class="text-[10px] text-white/50 bg-white/5 border-l-2 p-1 pl-2 mb-1 rounded-r border-white/20 line-clamp-1">
                          <span class="font-bold">&#64;{{ comment.replyTo.author }}</span>: {{ comment.replyTo.content }}
                        </div>
                      }
                      <p class="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{{ comment.content }}</p>
                      <div class="flex items-center gap-4 mt-3">
                        <button type="button" (click)="likeComment(comment.id)"
                          [attr.aria-pressed]="isCommentLiked(comment.id)"
                          class="flex items-center gap-1.5 transition-colors"
                          [ngClass]="isCommentLiked(comment.id) ? 'text-red-500' : 'text-white/40 hover:text-white'">
                          <lucide-icon name="heart" class="w-3.5 h-3.5" [class.fill-red-500]="isCommentLiked(comment.id)"></lucide-icon>
                          <span class="text-xs">{{ comment.likes || 0 }}</span>
                        </button>
                        <button type="button" (click)="initReply(comment)"
                          class="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
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
          <div class="shrink-0 p-4 bg-gradient-to-t from-black via-black/95 to-[rgba(0,0,0,0.8)] sticky bottom-[64px] sm:bottom-[70px] left-0 right-0 z-[50] mt-auto border-t border-black backdrop-blur-sm">
            @if (replyingTo) {
              <div class="flex items-center justify-between bg-zinc-800 rounded-t-xl px-4 py-2 border-b border-white/10">
                <span class="text-xs font-bold text-white/60 truncate">En réponse à {{ replyingTo.author }}…</span>
                <button type="button" (click)="cancelReply()" aria-label="Annuler la réponse"
                  class="text-white/40 hover:text-white"><lucide-icon name="x" class="w-3 h-3"></lucide-icon></button>
              </div>
            }
            <div class="flex items-center gap-2 bg-zinc-900/80 p-1 pl-4 border border-white/10"
                 [ngClass]="replyingTo ? 'rounded-b-2xl' : 'rounded-full'">
              <input
                type="text"
                [(ngModel)]="newCommentText"
                (keyup.enter)="postComment()"
                [placeholder]="replyingTo ? 'Votre réponse…' : 'Participer au débat…'"
                aria-label="Écrire un commentaire"
                class="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/40" />
              <button type="button" (click)="postComment()"
                [disabled]="!newCommentText.trim() || isPosting()"
                aria-label="Envoyer le commentaire"
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                [style.backgroundColor]="accentColor">
                @if (isPosting()) {
                  <lucide-icon name="loader" class="w-4 h-4 text-black animate-spin"></lucide-icon>
                } @else {
                  <lucide-icon name="send" class="w-4 h-4 text-black"></lucide-icon>
                }
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
                        <img [src]="voice.avatar" referrerpolicy="no-referrer" [alt]="voice.author" loading="lazy"
                          class="w-8 h-8 rounded-full object-cover" />
                        <div class="flex flex-col">
                          <span class="text-sm font-bold text-white">{{ voice.author }}</span>
                          <span class="text-[10px] uppercase tracking-wider text-white/50">{{ voice.source }}</span>
                        </div>
                      </div>
                      <div class="p-2 rounded-full bg-black/50 text-white/70">
                        @if (voice.type === 'tweet') { <lucide-icon name="twitter" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'audio') { <lucide-icon name="mic" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'video') { <lucide-icon name="video" class="w-4 h-4"></lucide-icon> }
                        @if (voice.type === 'text')  { <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon> }
                      </div>
                    </div>

                    @if (voice.title) {
                      <h4 class="text-base font-bold text-white leading-tight">{{ voice.title }}</h4>
                    }

                    <p class="text-sm text-white/80 leading-relaxed line-clamp-3">{{ voice.content }}</p>

                    <a [href]="voice.url" target="_blank" rel="noopener noreferrer"
                       class="text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1 hover:underline w-fit"
                       [style.color]="accentColor">
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
  `,
})
export class RoomModuleComponent implements OnChanges {
  @Input() articleId!: string;
  @Input() voices: ExternalVoice[] = [];
  /** Legacy seed list — kept until every caller stops passing it. */
  @Input() comments: Comment[] = [];
  @Input() accentColor = '#ffffff';

  private interaction = inject(InteractionService);
  private comm = inject(CommentService);

  activeTab = signal<RoomTab>('debates');
  newCommentText = '';
  replyingTo: Comment | null = null;
  likedComments = new Set<string>();
  isPosting = signal(false);
  loading = signal(false);

  /** Computed view of the current article's comments — service-backed
   *  with a graceful fallback to the legacy `@Input() comments`. */
  readonly visibleComments = computed<Comment[]>(() => {
    const id = this.articleId;
    if (!id) return this.comments;
    const cached = this.comm.commentsFor(id)();
    if (cached.length > 0 || this.comm.isLoaded(id)) return cached;
    return this.comments;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['articleId']) return;
    const id = changes['articleId'].currentValue as string;
    if (!id || this.comm.isLoaded(id)) return;
    this.loading.set(true);
    void this.comm.list(id).finally(() => this.loading.set(false));
  }

  isPending(commentId: string): boolean {
    return commentId.startsWith('pending-');
  }

  initReply(comment: Comment) { this.replyingTo = comment; }
  cancelReply() { this.replyingTo = null; }

  isCommentLiked(commentId: string): boolean {
    return this.likedComments.has(commentId);
  }

  likeComment(commentId: string) {
    if (this.likedComments.has(commentId)) this.likedComments.delete(commentId);
    else this.likedComments.add(commentId);
    // TODO: persist comment likes through a dedicated comment-likes
    // table in a follow-up; the backend RPC is not in place yet.
  }

  async postComment() {
    if (!this.newCommentText.trim() || !this.articleId || this.isPosting()) return;
    this.isPosting.set(true);
    try {
      const replyTo = this.replyingTo ?? undefined;
      await this.comm.post(this.articleId, this.newCommentText, replyTo);
      this.newCommentText = '';
      this.replyingTo = null;
      this.interaction.logComment(this.articleId);
    } finally {
      this.isPosting.set(false);
    }
  }
}
