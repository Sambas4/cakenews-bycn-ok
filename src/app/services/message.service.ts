import { Injectable, signal, effect, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Logger } from './logger.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ChatType = 'direct' | 'notification' | 'admin';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: MessageStatus;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  type: ChatType;
  ownerId: string;
  sender: string;
  avatarUrl?: string;
  fallbackInitials: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isVerified?: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  messages: ChatMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  conversations = signal<Conversation[]>([]);
  private collectionName = 'conversations';
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private logger = inject(Logger);
  private channel: RealtimeChannel | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.initSupabaseSync(user.id);
      } else {
        if (this.channel) {
          void this.supabaseService.client.removeChannel(this.channel);
          this.channel = null;
        }
        this.conversations.set([]);
      }
    });
  }

  private async initSupabaseSync(userId: string) {
    try {
      const { data, error } = await this.supabaseService.client
         .from(this.collectionName)
         .select('*')
         .eq('ownerId', userId);

      if (error) throw error;
      if (data) this.setAndSortConversations(data as Conversation[]);
    } catch (e) {
      this.logger.error('message.initSync', e);
    }

    if (this.channel) await this.supabaseService.client.removeChannel(this.channel);

    this.channel = this.supabaseService.client.channel(`public:${this.collectionName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: this.collectionName, filter: `ownerId=eq.${userId}` }, async () => {
         const { data } = await this.supabaseService.client.from(this.collectionName).select('*').eq('ownerId', userId);
         if (data) this.setAndSortConversations(data as Conversation[]);
      }).subscribe();
  }

  private setAndSortConversations(data: Conversation[]) {
      data.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return a.id.localeCompare(b.id);
      });
      this.conversations.set(data);
  }

  async sendMessage(conversationId: string, text: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (!conv) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      conversationId,
      senderId: 'me',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isMe: true
    };

    const updatedConv = { ...conv };
    updatedConv.messages = [...(updatedConv.messages || []), newMsg];
    updatedConv.lastMessage = text;
    updatedConv.timestamp = newMsg.timestamp;

    try {
      await this.supabaseService.client.from(this.collectionName).upsert(updatedConv);
    } catch (e) {
      this.logger.error('message.sendMessage', e);
    }
  }

  async markAsRead(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      try {
        await this.supabaseService.client.from(this.collectionName).update({ unreadCount: 0 }).eq('id', conversationId);
      } catch (e) {
        this.logger.error('message.markAsRead', e);
      }
    }
  }
}
