import { Injectable, signal, effect, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
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
  private channel: RealtimeChannel | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initSupabaseSync(user.id);
      } else {
        if (this.channel) {
          this.supabaseService.client.removeChannel(this.channel);
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

      if (!data || data.length === 0) {
        console.log('📦 [Supabase] Base vide pour cet utilisateur, injection...');
        await this.seedDatabase(userId);
      } else {
        this.setAndSortConversations(data as Conversation[]);
      }
    } catch (e: any) {
      console.error("Erreur de lecture initiale:", e.message);
    }

    if (this.channel) await this.supabaseService.client.removeChannel(this.channel);

    this.channel = this.supabaseService.client.channel(`public:${this.collectionName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: this.collectionName, filter: `ownerId=eq.${userId}` }, async (payload) => {
         // simple refetch is easier if payload is complex
         const { data } = await this.supabaseService.client.from(this.collectionName).select('*').eq('ownerId', userId);
         if (data) this.setAndSortConversations(data as Conversation[]);
      }).subscribe();
  }

  private setAndSortConversations(data: Conversation[]) {
      data.sort((a,b) => {
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
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      status: 'sent',
      isMe: true
    };

    const updatedConv = { ...conv };
    updatedConv.messages = [...(updatedConv.messages || []), newMsg];
    updatedConv.lastMessage = text;
    updatedConv.timestamp = newMsg.timestamp;

    try {
      await this.supabaseService.client.from(this.collectionName).upsert(updatedConv);
    } catch(e: any) {
      console.error('Erreur update:', e);
    }
    
    if (updatedConv.type === 'direct') {
       setTimeout(() => this.simulateReply(conversationId), 2500);
    }
  }

  async markAsRead(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      try {
        await this.supabaseService.client.from(this.collectionName).update({ unreadCount: 0 }).eq('id', conversationId);
      } catch(e: any) {
        console.error('Erreur update:', e);
      }
    }
  }

  private async simulateReply(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (!conv) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      conversationId,
      senderId: 'other',
      text: 'Message bien reçu via protocole sécurisé Supabase. 🚀 Je reviens vers toi.',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      status: 'delivered',
      isMe: false
    };

    const updatedConv = { ...conv };
    updatedConv.messages = [...(updatedConv.messages||[]), newMsg];
    updatedConv.lastMessage = newMsg.text;
    updatedConv.timestamp = newMsg.timestamp;
    updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
    
    try {
      await this.supabaseService.client.from(this.collectionName).upsert(updatedConv);
    } catch(e: any) {
       console.error("error simulate", e);
    }
  }

  private async seedDatabase(userId: string) {
    const mocks: Conversation[] = [
      {
        id: `${userId}_priv-1`,
        ownerId: userId,
        type: 'direct',
        sender: 'Dr. Émilie Laurent',
        avatarUrl: 'https://picsum.photos/seed/doc/100/100',
        fallbackInitials: 'EL',
        lastMessage: "Je t'envoie les documents sources via notre canal chiffré.",
        timestamp: '14:22',
        unreadCount: 2,
        isOnline: true,
        isVerified: true,
        messages: [
          { id: 'm1', conversationId: `${userId}_priv-1`, senderId: 'other', isMe: false, text: "Salut, je viens d'obtenir les documents de l'enquête.", timestamp: '14:15', status: 'read' },
          { id: 'm2', conversationId: `${userId}_priv-1`, senderId: 'me', isMe: true, text: "Parfait. Passe par la messagerie chiffrée, on ne sait jamais.", timestamp: '14:16', status: 'read' },
          { id: 'm3', conversationId: `${userId}_priv-1`, senderId: 'other', isMe: false, text: "Je t'envoie les documents sources via notre canal chiffré.", timestamp: '14:22', status: 'read' }
        ]
      },
      // ... (other mocks kept short or similar)
      {
        id: `${userId}_notif-smart-1`,
        ownerId: userId,
        type: 'notification',
        sender: 'Radar Débats',
        fallbackInitials: 'RD',
        lastMessage: "Un utilisateur de votre débat suscite de fortes réactions.",
        timestamp: 'Il y a 10m',
        unreadCount: 1,
        isOnline: false,
        messages: [
          { id: 'm1', conversationId: `${userId}_notif-smart-1`, senderId: 'system', isMe: false, text: '[ALERTE DÉBAT INTELLIGENT] L\'Auteur "Vision2026" que vous avez contredit génère une quantité inhabituelle de trafic dans votre secteur d\'information. Son intervention compte 523 commentaires.', timestamp: '18:00', status: 'read' }
        ]
      }
    ];

    for (const chat of mocks) {
      try {
        await this.supabaseService.client.from(this.collectionName).upsert(chat);
      } catch(e: any) {
        console.error(e);
      }
    }
  }
}
