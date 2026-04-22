import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, Conversation } from '../services/message.service';
import { MessageListComponent } from '../features/messaging/message-list.component';
import { ChatRoomComponent } from '../features/messaging/chat-room.component';
import { MessageSettingsComponent } from '../features/messaging/message-settings.component';

type ViewState = 'list' | 'chat' | 'settings';

@Component({
  selector: 'app-messages-view',
  standalone: true,
  imports: [CommonModule, MessageListComponent, ChatRoomComponent, MessageSettingsComponent],
  template: `
    <div class="h-full w-full flex flex-col bg-black text-white font-sans relative overflow-hidden">
      @switch (currentView()) {
        @case ('list') {
           <app-message-list 
             [conversations]="conversations()" 
             (chatSelected)="openChat($event)" 
             (settings)="openSettings()" />
        }
        @case ('chat') {
           @if (currentChatData()) {
             <app-chat-room 
               [chatData]="currentChatData()!" 
               (back)="goBack()" />
           }
        }
        @case ('settings') {
           <app-message-settings 
             (back)="goBack()" />
        }
      }
    </div>
  `
})
export class MessagesViewComponent {
  private messageService = inject(MessageService);

  currentView = signal<ViewState>('list');
  selectedChatId = signal<string | null>(null);

  // Vue unique des données, gérées globalement par le store
  conversations = computed(() => this.messageService.conversations());

  currentChatData = computed(() => {
    const id = this.selectedChatId();
    if (!id) return null;
    return this.conversations().find(c => c.id === id) || null;
  });

  openChat(chat: Conversation) {
    this.selectedChatId.set(chat.id);
    this.currentView.set('chat');
    this.messageService.markAsRead(chat.id);
  }

  openSettings() {
    this.currentView.set('settings');
  }

  goBack() {
    this.selectedChatId.set(null);
    this.currentView.set('list');
  }
}
