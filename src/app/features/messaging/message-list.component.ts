import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Conversation, ChatType } from '../../services/message.service';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Header Inbox -->
    <header class="flex-none flex items-center justify-between px-5 h-[60px] bg-black border-b border-white/5 z-20">
      <div class="flex items-center gap-3">
        <h1 class="text-[22px] font-bold tracking-tight text-white">Messagerie</h1>
      </div>
      <div class="flex items-center gap-4">
        <button (click)="toggleSearch()" class="text-zinc-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5">
          <lucide-icon name="search" class="w-[20px] h-[20px]"></lucide-icon>
        </button>
        <button (click)="settings.emit()" class="text-zinc-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5">
          <lucide-icon name="settings" class="w-[20px] h-[20px]"></lucide-icon>
        </button>
      </div>
    </header>

    <!-- Search Bar -->
    @if (isSearchVisible()) {
      <div class="flex-none px-4 py-2 bg-black border-b border-white/5 transition-all">
        <div class="relative flex items-center">
          <lucide-icon name="search" class="w-4 h-4 text-zinc-500 absolute left-3"></lucide-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher une discussion..." class="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-[14px] text-white outline-none focus:border-white/20 transition-colors">
          @if (searchQuery()) {
            <button (click)="searchQuery.set('')" class="absolute right-3 text-zinc-500 hover:text-white">
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          }
        </div>
      </div>
    }

    <!-- Segmented Control -->
    <div class="flex-none px-4 py-3 bg-black z-10 w-full">
      <div class="flex w-full bg-zinc-900/80 p-1 rounded-xl border border-white/5">
        <button (click)="setFilter('direct')"
                class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all text-center relative"
                [ngClass]="activeFilter() === 'direct' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'">
          Privés
          @if (hasUnread('direct')()) {
            <span class="absolute top-2 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          }
        </button>
        <button (click)="setFilter('notification')"
                class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all text-center relative"
                [ngClass]="activeFilter() === 'notification' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'">
           Débats
          @if (hasUnread('notification')()) {
            <span class="absolute top-2 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          }
        </button>
        <button (click)="setFilter('admin')"
                class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all text-center relative"
                [ngClass]="activeFilter() === 'admin' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'">
          Admin
          @if (hasUnread('admin')()) {
            <span class="absolute top-2 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          }
        </button>
      </div>
    </div>

    <!-- Liste proportionnelle -->
    <div class="flex-1 overflow-y-auto w-full custom-scrollbar">
      @if (filteredChats().length === 0) {
        <div class="flex flex-col items-center justify-center h-full text-zinc-500">
          <lucide-icon name="archive" class="w-12 h-12 mb-3 opacity-20"></lucide-icon>
          <p class="text-[13px] font-medium tracking-wide uppercase">Aucun élément</p>
        </div>
      }

      <ul class="flex flex-col pb-safe w-full relative">
        @for (chat of filteredChats(); track chat.id) {
          <li (click)="onChatClick(chat)" class="flex items-center w-full px-4 h-[80px] hover:bg-white/[0.02] cursor-pointer active:bg-white/[0.04] transition-colors border-b border-white/[0.02] group">
            
            <!-- Avatar -->
            <div class="relative shrink-0 w-[56px] h-[56px]">
               @if (chat.avatarUrl) {
                 <img [src]="chat.avatarUrl" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover shadow-sm bg-zinc-800 border-none relative z-10">
               } @else {
                 <div class="w-full h-full rounded-full flex items-center justify-center text-[18px] font-bold shadow-inner relative z-10"
                      [ngClass]="getAvatarColor(chat)">
                   @if (chat.type === 'admin') {
                     <lucide-icon name="shield-check" class="w-6 h-6"></lucide-icon>
                   } @else if (chat.type === 'notification') {
                     <lucide-icon name="activity" class="w-6 h-6"></lucide-icon>
                   } @else {
                     {{ chat.fallbackInitials }}
                   }
                 </div>
               }
               @if (chat.isOnline && chat.type === 'direct') {
                 <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-black z-20"></div>
               }
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 flex flex-col justify-center h-full pl-3.5 pr-2">
              <div class="flex items-center justify-between mb-1.5 w-full">
                <div class="flex items-center gap-1.5 min-w-0">
                  <h2 class="text-[16px] font-semibold truncate transition-colors leading-none" 
                      [class.text-white]="chat.unreadCount > 0" 
                      [class.text-zinc-200]="chat.unreadCount === 0">
                    {{ chat.sender }}
                  </h2>
                  @if (chat.isVerified) {
                    <lucide-icon name="check-circle-2" class="w-4 h-4 text-blue-500 shrink-0"></lucide-icon>
                  }
                  @if (chat.type === 'direct') {
                    <lucide-icon name="lock" class="w-3 h-3 text-emerald-500/50 shrink-0 ml-0.5" title="Chiffré de bout en bout"></lucide-icon>
                  }
                </div>
                <span class="text-[12px] shrink-0 font-medium leading-none" 
                      [class.text-blue-500]="chat.unreadCount > 0" 
                      [class.text-zinc-500]="chat.unreadCount === 0">
                  {{ chat.timestamp }}
                </span>
              </div>
              
              <div class="flex items-center justify-between w-full h-[20px]">
                <p class="text-[14px] truncate flex-1 leading-none" 
                   [class.text-zinc-300]="chat.unreadCount > 0" 
                   [class.font-medium]="chat.unreadCount > 0"
                   [class.text-zinc-500]="chat.unreadCount === 0">
                   {{ chat.lastMessage }}
                </p>
                
                @if (chat.unreadCount > 0) {
                  <div class="shrink-0 h-[22px] min-w-[22px] px-1.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[12px] font-bold shadow-sm ml-3 leading-none">
                    {{ chat.unreadCount }}
                  </div>
                }
              </div>
            </div>
          </li>
        }
      </ul>
    </div>
    
    <!-- FLT Button New Chat-->
    @if (activeFilter() === 'direct') {
       <button class="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-transform active:scale-95 z-30">
           <lucide-icon name="plus" class="w-6 h-6"></lucide-icon>
       </button>
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
export class MessageListComponent {
  conversations = input.required<Conversation[]>();
  chatSelected = output<Conversation>();
  settings = output<void>();

  activeFilter = signal<ChatType>('direct');
  isSearchVisible = signal<boolean>(false);
  searchQuery = signal<string>('');

  filteredChats = computed(() => {
    const str = this.searchQuery().toLowerCase().trim();
    let result = this.conversations().filter(chat => chat.type === this.activeFilter());
    if (str) {
      result = result.filter(c => 
        c.sender.toLowerCase().includes(str) || 
        c.lastMessage.toLowerCase().includes(str)
      );
    }
    return result.sort((a,b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return 0;
    });
  });

  hasUnread(type: ChatType) {
    return computed(() => {
      return this.conversations().some(chat => chat.type === type && chat.unreadCount > 0);
    });
  }

  setFilter(filter: ChatType) {
    this.activeFilter.set(filter);
    this.isSearchVisible.set(false);
    this.searchQuery.set('');
  }

  toggleSearch() {
    this.isSearchVisible.update(v => !v);
    if (!this.isSearchVisible()) {
        this.searchQuery.set('');
    }
  }

  onChatClick(chat: Conversation) {
     this.chatSelected.emit(chat);
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
