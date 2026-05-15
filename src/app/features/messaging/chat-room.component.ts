import { Component, effect, ElementRef, inject, input, output, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Conversation, MessageService } from '../../services/message.service';

interface MessageGroup {
  dayLabel: string;
  messages: Conversation['messages'];
}

/**
 * Conversation pane.
 *
 * Highlights:
 *  - Sticky header with online indicator and verified badge
 *  - E2EE banner (only for direct chats; system canals get a different note)
 *  - Day-grouped message list (auto-scroll to bottom on new payload)
 *  - Auto-grow text-area input with paperclip / mic / send affordances
 *  - Read-only footer for system / admin canals
 *
 * Pure presentation: parent owns selection state.
 */
@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full w-full flex flex-col bg-[#08080a] text-white">

      <!-- Header -->
      <header class="flex-none flex items-center justify-between px-2 h-[60px] bg-black border-b border-white/[0.05] z-20">
        <div class="flex items-center gap-2 min-w-0">
          <button type="button" (click)="back.emit()" aria-label="Retour"
            class="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
          </button>

          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                 [ngClass]="avatarColor(chatData())">
              @if (chatData().avatarUrl) {
                <img [src]="chatData().avatarUrl" alt="" referrerpolicy="no-referrer" loading="lazy" class="w-full h-full object-cover" />
              } @else {
                @if (chatData().type === 'admin') { <lucide-icon name="shield-check" class="w-4 h-4"></lucide-icon> }
                @else if (chatData().type === 'notification') { <lucide-icon name="bell" class="w-4 h-4"></lucide-icon> }
                @else { <span class="text-[12.5px] font-black">{{ chatData().fallbackInitials }}</span> }
              }
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1 min-w-0">
                <span class="text-[14px] font-black text-white truncate">{{ chatData().sender }}</span>
                @if (chatData().isVerified) {
                  <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#1d9bf0] shrink-0"></lucide-icon>
                }
              </div>
              <span class="text-[10.5px] font-semibold leading-none">
                @if (chatData().type === 'direct') {
                  @if (chatData().isOnline) {
                    <span class="text-emerald-400">En ligne</span>
                  } @else {
                    <span class="text-zinc-500">Hors ligne</span>
                  }
                } @else if (chatData().type === 'admin') {
                  <span class="text-indigo-300">Canal officiel</span>
                } @else {
                  <span class="text-amber-300">Notification système</span>
                }
              </span>
            </div>
          </div>
        </div>

        <button type="button" aria-label="Plus"
          class="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-colors">
          <lucide-icon name="more-horizontal" class="w-5 h-5"></lucide-icon>
        </button>
      </header>

      <!-- Banner -->
      <div class="flex-none px-4 py-2 flex justify-center bg-black border-b border-white/[0.03]">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
          [ngClass]="bannerClass()">
          <lucide-icon [name]="bannerIcon()" class="w-3 h-3"></lucide-icon>
          {{ bannerText() }}
        </div>
      </div>

      <!-- Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        @for (group of grouped(); track group.dayLabel) {
          <div class="flex justify-center my-3">
            <span class="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {{ group.dayLabel }}
            </span>
          </div>
          @for (msg of group.messages; track msg.id) {
            <div class="flex w-full mb-2" [ngClass]="msg.isMe ? 'justify-end' : 'justify-start'">
              <div class="max-w-[75%] rounded-2xl px-4 py-2.5 flex flex-col"
                [ngClass]="msg.isMe
                  ? 'bg-[#7ae25c] text-black rounded-br-md'
                  : (chatData().type === 'admin'
                      ? 'bg-indigo-500/12 border border-indigo-500/20 text-indigo-100 rounded-bl-md'
                      : (chatData().type === 'notification'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-bl-md'
                          : 'bg-white/[0.05] border border-white/[0.06] text-white rounded-bl-md'))">
                <p class="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">{{ msg.text }}</p>
                <div class="flex items-center justify-end gap-1 mt-1 opacity-70">
                  <span class="text-[10px] tabular-nums">{{ msg.timestamp }}</span>
                  @if (msg.isMe) {
                    <lucide-icon name="check-circle-2" class="w-3 h-3"
                      [ngClass]="msg.status === 'read' ? 'opacity-100' : 'opacity-50'"></lucide-icon>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer -->
      @if (chatData().type === 'direct') {
        <footer class="flex-none px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] bg-black border-t border-white/[0.05]">
          <div class="flex items-end gap-2">
            <button type="button" aria-label="Joindre"
              class="w-10 h-10 shrink-0 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <lucide-icon name="paperclip" class="w-5 h-5"></lucide-icon>
            </button>
            <div class="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-3xl px-4 py-2 flex items-center min-h-[44px]">
              <input #composer type="text"
                [ngModel]="draft()"
                (ngModelChange)="draft.set($event)"
                (keyup.enter)="send()"
                placeholder="Message chiffré…"
                class="w-full bg-transparent border-none outline-none text-[14.5px] py-2"
                autocomplete="off"
                inputmode="text"
                aria-label="Composer un message" />
            </div>
            <button type="button" (click)="send()" [disabled]="!draft().trim()"
              class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all"
              [ngClass]="draft().trim() ? 'bg-[#7ae25c] text-black active:scale-95' : 'bg-white/[0.06] text-zinc-500'">
              <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
            </button>
          </div>
        </footer>
      } @else {
        <footer class="flex-none px-4 py-4 pb-[max(env(safe-area-inset-bottom),16px)] bg-black border-t border-white/[0.05] flex items-center justify-center gap-2">
          <lucide-icon name="info" class="w-3.5 h-3.5 text-zinc-500"></lucide-icon>
          <span class="text-[11.5px] text-zinc-500 font-semibold">Canal en lecture seule</span>
        </footer>
      }
    </div>
  `
})
export class ChatRoomComponent {
  chatData = input.required<Conversation>();
  back = output<void>();

  readonly draft = signal('');
  private messageService = inject(MessageService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  readonly grouped = computed<MessageGroup[]>(() => {
    const msgs = this.chatData().messages ?? [];
    if (msgs.length === 0) return [];
    // Group by best-effort day label. The mock dataset stores `timestamp`
    // as 'HH:MM' so we collapse everything under a single "Aujourd'hui"
    // bucket; once persisted with ISO dates the grouping naturally splits.
    const groups: MessageGroup[] = [];
    let current: MessageGroup | null = null;
    for (const m of msgs) {
      const day = this.dayLabelFor(m.timestamp);
      if (!current || current.dayLabel !== day) {
        current = { dayLabel: day, messages: [] };
        groups.push(current);
      }
      current.messages.push(m);
    }
    return groups;
  });

  readonly bannerText = computed(() => {
    switch (this.chatData().type) {
      case 'direct': return 'Chiffrement de bout en bout';
      case 'admin': return 'Canal officiel CakeNews';
      default: return 'Notification système';
    }
  });

  readonly bannerIcon = computed(() => {
    switch (this.chatData().type) {
      case 'direct': return 'lock';
      case 'admin': return 'shield-check';
      default: return 'bell';
    }
  });

  readonly bannerClass = computed(() => {
    switch (this.chatData().type) {
      case 'direct': return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300';
      case 'admin': return 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300';
      default: return 'bg-amber-500/10 border border-amber-500/20 text-amber-300';
    }
  });

  constructor() {
    // Auto-scroll on new messages.
    effect(() => {
      const _ = this.chatData().messages.length;
      void _;
      requestAnimationFrame(() => {
        const el = this.scrollContainer?.nativeElement;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
      });
    });
  }

  send() {
    const text = this.draft().trim();
    if (!text) return;
    this.messageService.sendMessage(this.chatData().id, text);
    this.draft.set('');
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

  private dayLabelFor(ts: string): string {
    // Best-effort: the mock data uses 'HH:MM' which we display as
    // "Aujourd'hui". Real ISO timestamps fall back to a localized date.
    if (/^\d{1,2}:\d{2}$/.test(ts)) return "Aujourd'hui";
    if (ts.startsWith('Il y a')) return "Aujourd'hui";
    const t = Date.parse(ts);
    if (Number.isNaN(t)) return ts;
    const d = new Date(t);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  }
}
