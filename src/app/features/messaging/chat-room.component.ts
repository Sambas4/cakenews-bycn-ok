import { Component, effect, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Conversation, MessageService } from '../../services/message.service';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Chat Header -->
    <header class="flex-none flex items-center justify-between px-2 h-[64px] bg-zinc-950 border-b border-white/5 z-20">
      <div class="flex items-center gap-1">
        <button (click)="back.emit()" class="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <lucide-icon name="chevron-left" class="w-7 h-7"></lucide-icon>
        </button>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 text-[14px] font-bold overflow-hidden" [ngClass]="getAvatarColor(chatData())">
             @if (chatData().avatarUrl) {
               <img [src]="chatData().avatarUrl" class="w-full h-full object-cover">
             } @else {
               @if (chatData().type === 'admin') { <lucide-icon name="shield-check" class="w-5 h-5"></lucide-icon> }
               @else if (chatData().type === 'notification') { <lucide-icon name="activity" class="w-5 h-5"></lucide-icon> }
               @else { {{ chatData().fallbackInitials }} }
             }
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-white leading-tight flex items-center gap-1">
              {{ chatData().sender }}
              @if (chatData().isVerified) { <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-blue-500"></lucide-icon> }
            </span>
            <span class="text-[11px] text-zinc-500 font-medium">
              @if (chatData().type === 'direct') { 
                @if(chatData().isOnline) { <span class="text-emerald-500">En ligne</span> } @else { Hors ligne }
              } @else {
                Canal système officiel
              }
            </span>
          </div>
        </div>
      </div>
      <button class="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-white/5">
         <lucide-icon name="more-horizontal" class="w-5 h-5"></lucide-icon>
      </button>
    </header>

    <!-- E2EE Notice -->
    <div class="flex-none bg-black py-3 px-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 flex justify-center border-b border-white/[0.02]">
      <div class="bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2 max-w-sm">
        <lucide-icon name="lock" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></lucide-icon>
        <p class="text-[10px] text-emerald-400/80 font-medium text-center uppercase tracking-wide">
          @if (chatData().type === 'direct') {
            Messages chiffrés de bout en bout
          } @else {
            Protocole sécurisé de l'administration
          }
        </p>
      </div>
    </div>

    <!-- Messages Area -->
    <div #scrollContainer class="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 bg-[#0a0a0c] safe-bottom-padding custom-scrollbar">
      @for (msg of chatData().messages; track msg.id) {
        <div class="flex w-full" [ngClass]="msg.isMe ? 'justify-end' : 'justify-start'">
          <div class="max-w-[75%] rounded-2xl px-4 py-2.5 relative flex flex-col gap-1"
               [ngClass]="msg.isMe ? 'bg-blue-600 rounded-br-sm text-white' : 'bg-zinc-800/80 rounded-bl-sm text-zinc-100 border border-white/5'">
             <p class="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{{ msg.text }}</p>
             <div class="flex items-center justify-end gap-1.5 opacity-60 mt-0.5">
               <span class="text-[10px] font-medium">{{ msg.timestamp }}</span>
               @if (msg.isMe) {
                 <lucide-icon name="check-circle-2" class="w-3 h-3" [class.text-blue-200]="msg.status !== 'read'" [class.text-white]="msg.status === 'read'"></lucide-icon>
               }
             </div>
          </div>
        </div>
      }
    </div>

    <!-- Chat Input Fixed Bottom -->
    @if (chatData().type === 'direct') {
      <footer class="flex-none bg-zinc-950 border-t border-white/5 px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)] z-20">
        <div class="flex items-end gap-2">
          <button class="w-10 h-10 shrink-0 text-zinc-400 hover:text-white flex items-center justify-center rounded-full hover:bg-white/5 transition-colors cursor-pointer">
            <lucide-icon name="paperclip" class="w-5 h-5"></lucide-icon>
          </button>
          <div class="flex-1 bg-zinc-900 border border-white/10 rounded-2xl min-h-[44px] max-h-[120px] overflow-hidden flex items-center px-4">
            <input type="text" [(ngModel)]="messageInput" (keyup.enter)="sendMessage()" placeholder="VOTRE message chiffré..." class="w-full bg-transparent border-none outline-none text-[15px] text-white py-3">
          </div>
          <button (click)="sendMessage()" [disabled]="!messageInput().trim()" class="w-11 h-11 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-sm disabled:opacity-50">
            <lucide-icon name="send" class="w-4 h-4 ml-0.5"></lucide-icon>
          </button>
        </div>
      </footer>
    } @else {
      <!-- Footer lecture seule -->
      <footer class="flex-none bg-zinc-950 border-t border-white/5 p-4 pb-[max(env(safe-area-inset-bottom),16px)] flex justify-center">
        <span class="text-[13px] font-medium text-zinc-500">Seuls les administrateurs peuvent publier ici.</span>
      </footer>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    .safe-bottom-padding {
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }
  `]
})
export class ChatRoomComponent {
  chatData = input.required<Conversation>();
  back = output<void>();
  
  messageInput = signal('');
  private messageService = inject(MessageService);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      // Create a dependency on the messages array so we auto-scroll when it changes
      const messages = this.chatData().messages;
      this.triggerScroll();
    });
  }

  sendMessage() {
     const text = this.messageInput().trim();
     if (!text) return;
     this.messageService.sendMessage(this.chatData().id, text);
     this.messageInput.set('');
  }

  private triggerScroll() {
    requestAnimationFrame(() => {
      // Robust DOM handling avoiding empty catch block
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
      }
    });
  }

  getAvatarColor(chat: Conversation): string {
    if (chat.type === 'admin') return 'bg-blue-600 text-white';
    if (chat.type === 'notification') return 'bg-zinc-800 text-zinc-100 border border-white/10';
    
    const colors = [
      'bg-emerald-600 text-white', 'bg-rose-600 text-white', 
      'bg-indigo-600 text-white', 'bg-amber-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < chat.id.length; i++) hash = chat.id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}
