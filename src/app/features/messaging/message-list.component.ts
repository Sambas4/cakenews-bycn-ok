import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Conversation, ChatType } from '../../services/message.service';

type FilterTab = 'direct' | 'notification' | 'admin';

interface TabDef {
  id: FilterTab;
  label: string;
  icon: string;
}

/**
 * Premium messaging inbox.
 *
 * - 3 segmented tabs (Privé chiffré, Notifications, Admin/Système)
 * - Animated unread counters
 * - Pinned-to-top unread sort with secondary chronological order
 * - Inline search with clear control
 * - Empty states tailored per tab
 *
 * Pure presentation: parent owns selection and side-effects.
 */
@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full w-full flex flex-col bg-black text-white">
      <!-- Header -->
      <header class="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] z-20 shrink-0">
        <div class="flex items-center gap-2">
          <h1 class="text-[18px] font-[1000] tracking-tight text-white">Messagerie</h1>
          @if (totalUnread() > 0) {
            <span class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff3b30] text-white text-[10px] font-black">
              {{ totalUnread() }}
            </span>
          }
        </div>
        <div class="flex items-center gap-1">
          <button type="button" (click)="toggleSearch()" aria-label="Rechercher"
            class="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <lucide-icon name="search" class="w-[18px] h-[18px]"></lucide-icon>
          </button>
          <button type="button" (click)="settings.emit()" aria-label="Paramètres"
            class="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <lucide-icon name="settings" class="w-[18px] h-[18px]"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- Search bar -->
      @if (searchOpen()) {
        <div class="shrink-0 px-4 py-2 border-b border-white/[0.04] animate-[slideUp_0.2s_ease-out]">
          <div class="relative">
            <lucide-icon name="search" class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"></lucide-icon>
            <input type="text" [ngModel]="query()" (ngModelChange)="query.set($event)"
              placeholder="Rechercher une conversation"
              class="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" />
            @if (query()) {
              <button type="button" (click)="query.set('')" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
              </button>
            }
          </div>
        </div>
      }

      <!-- Segmented tabs -->
      <div class="shrink-0 px-4 pt-3 pb-2">
        <div class="flex bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1">
          @for (t of tabs; track t.id) {
            <button type="button" (click)="setTab(t.id)"
              class="relative flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all"
              [ngClass]="active() === t.id ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'">
              <lucide-icon [name]="t.icon" class="w-3.5 h-3.5"></lucide-icon>
              {{ t.label }}
              @if (unreadFor(t.id)() > 0) {
                <span class="absolute top-1 right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff3b30] text-white text-[9px] font-black">
                  {{ unreadFor(t.id)() }}
                </span>
              }
            </button>
          }
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        @if (filtered().length === 0) {
          <div class="flex flex-col items-center justify-center h-full px-8 text-center">
            <div class="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <lucide-icon [name]="emptyIcon()" class="w-7 h-7 text-zinc-500"></lucide-icon>
            </div>
            <p class="text-[13px] font-bold text-white">{{ emptyTitle() }}</p>
            <p class="text-[11.5px] text-zinc-500 mt-1 leading-snug max-w-[260px]">{{ emptyHint() }}</p>
          </div>
        }

        <ul class="flex flex-col">
          @for (chat of filtered(); track chat.id) {
            <li (click)="chatSelected.emit(chat)"
              class="group cursor-pointer flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.025] active:bg-white/[0.05] transition-colors">

              <!-- Avatar w/ status dot -->
              <div class="relative shrink-0 w-12 h-12">
                @if (chat.avatarUrl) {
                  <img [src]="chat.avatarUrl" alt="" referrerpolicy="no-referrer" loading="lazy"
                    class="w-full h-full rounded-full object-cover bg-zinc-800" />
                } @else {
                  <div class="w-full h-full rounded-full flex items-center justify-center text-[15px] font-black"
                       [ngClass]="avatarColor(chat)">
                    @if (chat.type === 'admin') { <lucide-icon name="shield-check" class="w-5 h-5"></lucide-icon> }
                    @else if (chat.type === 'notification') { <lucide-icon name="bell" class="w-5 h-5"></lucide-icon> }
                    @else { {{ chat.fallbackInitials }} }
                  </div>
                }
                @if (chat.isOnline && chat.type === 'direct') {
                  <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black"></span>
                }
                @if (chat.unreadCount > 0) {
                  <span aria-hidden="true" class="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-[#7ae25c] animate-flash"></span>
                }
              </div>

              <!-- Body -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <h3 class="text-[14.5px] truncate"
                      [ngClass]="chat.unreadCount > 0 ? 'font-black text-white' : 'font-semibold text-zinc-200'">
                      {{ chat.sender }}
                    </h3>
                    @if (chat.isVerified) {
                      <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#1d9bf0] shrink-0"></lucide-icon>
                    }
                    @if (chat.type === 'direct') {
                      <lucide-icon name="lock" class="w-3 h-3 text-emerald-500/60 shrink-0" title="Chiffré E2EE"></lucide-icon>
                    }
                  </div>
                  <span class="text-[10.5px] tabular-nums shrink-0"
                    [ngClass]="chat.unreadCount > 0 ? 'text-[#7ae25c] font-bold' : 'text-zinc-500'">
                    {{ chat.timestamp }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-3 mt-0.5">
                  <p class="flex-1 truncate text-[13px] leading-tight"
                    [ngClass]="chat.unreadCount > 0 ? 'text-white/90 font-semibold' : 'text-zinc-500'">
                    {{ chat.lastMessage }}
                  </p>
                  @if (chat.unreadCount > 0) {
                    <span class="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#7ae25c] text-black text-[10.5px] font-black">
                      {{ chat.unreadCount }}
                    </span>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      </div>

      <!-- New chat FAB (private only) -->
      @if (active() === 'direct') {
        <button type="button" aria-label="Nouvelle conversation"
          class="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#7ae25c] text-black flex items-center justify-center shadow-[0_8px_24px_rgba(122,226,92,0.35)] active:scale-95 transition-transform z-30">
          <lucide-icon name="edit-3" class="w-5 h-5"></lucide-icon>
        </button>
      }
    </div>
  `
})
export class MessageListComponent {
  conversations = input.required<Conversation[]>();
  chatSelected = output<Conversation>();
  settings = output<void>();

  readonly tabs: TabDef[] = [
    { id: 'direct', label: 'Privé', icon: 'lock' },
    { id: 'notification', label: 'Alertes', icon: 'bell' },
    { id: 'admin', label: 'Système', icon: 'shield-check' },
  ];

  readonly active = signal<FilterTab>('direct');
  readonly searchOpen = signal(false);
  readonly query = signal('');

  readonly totalUnread = computed(() =>
    this.conversations().reduce((acc, c) => acc + (c.unreadCount || 0), 0)
  );

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    let list = this.conversations().filter(c => c.type === this.active());
    if (q) {
      list = list.filter(c =>
        c.sender.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      // Unread first, then chronological by id (timestamp lexicographic).
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      return b.id.localeCompare(a.id);
    });
  });

  unreadFor(type: ChatType) {
    return computed(() =>
      this.conversations().filter(c => c.type === type)
        .reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    );
  }

  emptyIcon = computed(() => {
    switch (this.active()) {
      case 'notification': return 'bell-off';
      case 'admin': return 'shield';
      default: return 'message-square';
    }
  });

  emptyTitle = computed(() => {
    switch (this.active()) {
      case 'notification': return 'Aucune alerte';
      case 'admin': return 'Tout est calme';
      default: return 'Aucun message';
    }
  });

  emptyHint = computed(() => {
    switch (this.active()) {
      case 'notification': return 'Tu seras notifié si un débat décolle ou si quelqu\'un répond à tes commentaires.';
      case 'admin': return 'L\'équipe CakeNews te contactera ici en cas de besoin.';
      default: return 'Démarre une conversation chiffrée avec un autre lecteur ou journaliste.';
    }
  });

  setTab(id: FilterTab) {
    this.active.set(id);
    if (this.searchOpen()) this.query.set('');
  }

  toggleSearch() {
    this.searchOpen.update(v => !v);
    if (!this.searchOpen()) this.query.set('');
  }

  avatarColor(chat: Conversation): string {
    if (chat.type === 'admin') return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
    if (chat.type === 'notification') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    const palette = [
      'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      'bg-rose-500/15 text-rose-300 border border-rose-500/30',
      'bg-violet-500/15 text-violet-300 border border-violet-500/30',
      'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < chat.id.length; i++) hash = chat.id.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
  }
}
