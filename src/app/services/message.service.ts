import { Injectable, signal, effect, inject } from '@angular/core';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocs, query, where, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase.service';
import { AuthService } from './auth.service';
import { handleFirestoreError } from '../utils/firestore-error-handler';

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
  private unsub: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.initFirestoreSync(user.uid);
      } else {
        if (this.unsub) {
          this.unsub();
          this.unsub = null;
        }
        this.conversations.set([]);
      }
    });
  }

  private async initFirestoreSync(userId: string) {
    // 1. Vérification et "Seeding" au premier lancement
    try {
      const q = query(collection(db, this.collectionName), where('ownerId', '==', userId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log('📦 [Firestore] Base vide pour cet utilisateur, injection...');
        await this.seedDatabase(userId);
      }
    } catch (e: any) {
      console.error("Erreur de lecture Firestore initiale:", e.message);
    }

    // 2. Écoute active en TEMPS RÉEL (WebSockets) restreint au ownerId
    const q = query(collection(db, this.collectionName), where('ownerId', '==', userId));
    this.unsub = onSnapshot(q, (querySnapshot) => {
      const data: Conversation[] = [];
      querySnapshot.forEach((docSnap) => {
        data.push(docSnap.data() as Conversation);
      });
      // Tri par base d'ID pour avoir un ordre stable dans la maquette
      data.sort((a,b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return a.id.localeCompare(b.id);
      });
      
      this.conversations.set(data);
      console.log('⚡ [Firestore] Synchronisation temps réel de ' + data.length + ' conversations reçue !');
    });
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

    // Copie de l'objet complet
    const updatedConv = { ...conv };
    updatedConv.messages = [...updatedConv.messages, newMsg];
    updatedConv.lastMessage = text;
    updatedConv.timestamp = newMsg.timestamp;

    // Écriture réseau
    try {
      await setDoc(doc(db, this.collectionName, conversationId), updatedConv);
    } catch(e: any) {
      handleFirestoreError(e, 'create', `${this.collectionName}/${conversationId}`);
    }
    
    // Simulation du bot qui répond via un autre noeud réseau (sur Firestore)
    if (updatedConv.type === 'direct') {
       setTimeout(() => this.simulateFirestoreReply(conversationId), 2500);
    }
  }

  async markAsRead(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      try {
        await updateDoc(doc(db, this.collectionName, conversationId), {
          unreadCount: 0
        });
      } catch(e: any) {
        handleFirestoreError(e, 'update', `${this.collectionName}/${conversationId}`);
      }
    }
  }

  private async simulateFirestoreReply(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (!conv) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      conversationId,
      senderId: 'other',
      text: 'Message bien reçu via protocole sécurisé Firestore E2EE. 🚀 Je reviens vers toi.',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      status: 'delivered',
      isMe: false
    };

    const updatedConv = { ...conv };
    updatedConv.messages = [...updatedConv.messages, newMsg];
    updatedConv.lastMessage = newMsg.text;
    updatedConv.timestamp = newMsg.timestamp;
    updatedConv.unreadCount += 1;
    
    try {
      await setDoc(doc(db, this.collectionName, conversationId), updatedConv);
    } catch(e: any) {
      handleFirestoreError(e, 'create', `${this.collectionName}/${conversationId}`);
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
        lastMessage: 'Je t\'envoie les documents sources via notre canal chiffré.',
        timestamp: '14:22',
        unreadCount: 2,
        isOnline: true,
        isVerified: true,
        messages: [
          { id: 'm1', conversationId: `${userId}_priv-1`, senderId: 'other', isMe: false, text: 'Salut, je viens d\'obtenir les documents de l\'enquête.', timestamp: '14:15', status: 'read' },
          { id: 'm2', conversationId: `${userId}_priv-1`, senderId: 'me', isMe: true, text: 'Parfait. Passe par la messagerie chiffrée, on ne sait jamais.', timestamp: '14:16', status: 'read' },
          { id: 'm3', conversationId: `${userId}_priv-1`, senderId: 'other', isMe: false, text: 'Je t\'envoie les documents sources via notre canal chiffré.', timestamp: '14:22', status: 'read' }
        ]
      },
      {
        id: `${userId}_notif-smart-1`,
        ownerId: userId,
        type: 'notification',
        sender: 'Radar Débats',
        fallbackInitials: 'RD',
        lastMessage: 'Un utilisateur de votre débat suscite de fortes réactions.',
        timestamp: 'Il y a 10m',
        unreadCount: 1,
        isOnline: false,
        messages: [
          { id: 'm1', conversationId: `${userId}_notif-smart-1`, senderId: 'system', isMe: false, text: '[ALERTE DÉBAT INTELLIGENT] L\'Auteur "Vision2026" que vous avez contredit génère une quantité inhabituelle de trafic dans votre secteur d\'information. Son intervention compte 523 commentaires.', timestamp: '18:00', status: 'read' },
          { id: 'm2', conversationId: `${userId}_notif-smart-1`, senderId: 'system', isMe: false, text: '👉 Vous pouvez retourner au débat depuis l\'article pour maintenir votre influence territoriale.', timestamp: '18:00', status: 'read' }
        ]
      },
      {
        id: `${userId}_admin-1`,
        ownerId: userId,
        type: 'admin',
        sender: 'Administration Centrale',
        fallbackInitials: 'ADM',
        lastMessage: 'Sécurité : Nouvelle validation de vos clés.',
        timestamp: '09:00',
        unreadCount: 0,
        isVerified: true,
        messages: [
          { id: 'm1', conversationId: `${userId}_admin-1`, senderId: 'system', isMe: false, text: '[MESSAGE AUTOMATIQUE DU SYSTÈME] Remplacement de vos paires de clés asymétriques effectué avec succès. Vos transmissions passées et futures utilisent la cryptographie AES-256.', timestamp: '09:00', status: 'read' }
        ]
      }
    ];

    for (const chat of mocks) {
      try {
        await setDoc(doc(db, this.collectionName, chat.id), chat);
      } catch(e: any) {
        handleFirestoreError(e, 'create', `${this.collectionName}/${chat.id}`);
      }
    }
  }
}
