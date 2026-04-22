import { Injectable, signal } from '@angular/core';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from './firebase.service';

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

  constructor() {
    this.initFirestoreSync();
  }

  private async initFirestoreSync() {
    // 1. Vérification et "Seeding" au premier lancement (si la base Firestore est vide)
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) {
        console.log('📦 [Firestore] Base vide, injection des données initiales sur Google Cloud...');
        await this.seedDatabase();
      }
    } catch (e: any) {
      console.error("Erreur de lecture Firestore initiale:", e.message);
    }

    // 2. Écoute active en TEMPS RÉEL (WebSockets)
    // Dès qu'un document change dans la collection 'conversations' sur les serveurs, Angular met à jour l'UI instantanément
    onSnapshot(collection(db, this.collectionName), (querySnapshot) => {
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
    await setDoc(doc(db, this.collectionName, conversationId), updatedConv);
    
    // Simulation du bot qui répond via un autre noeud réseau (sur Firestore)
    if (updatedConv.type === 'direct') {
       setTimeout(() => this.simulateFirestoreReply(conversationId), 2500);
    }
  }

  async markAsRead(conversationId: string) {
    const current = this.conversations();
    const conv = current.find(c => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      await updateDoc(doc(db, this.collectionName, conversationId), {
        unreadCount: 0
      });
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
    
    await setDoc(doc(db, this.collectionName, conversationId), updatedConv);
  }

  private async seedDatabase() {
    const mocks: Conversation[] = [
      {
        id: 'priv-1',
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
          { id: 'm1', conversationId: 'priv-1', senderId: 'other', isMe: false, text: 'Salut, je viens d\'obtenir les documents de l\'enquête.', timestamp: '14:15', status: 'read' },
          { id: 'm2', conversationId: 'priv-1', senderId: 'me', isMe: true, text: 'Parfait. Passe par la messagerie chiffrée, on ne sait jamais.', timestamp: '14:16', status: 'read' },
          { id: 'm3', conversationId: 'priv-1', senderId: 'other', isMe: false, text: 'Je t\'envoie les documents sources via notre canal chiffré.', timestamp: '14:22', status: 'read' }
        ]
      },
      {
        id: 'notif-smart-1',
        type: 'notification',
        sender: 'Radar Débats',
        fallbackInitials: 'RD',
        lastMessage: 'Un utilisateur de votre débat suscite de fortes réactions.',
        timestamp: 'Il y a 10m',
        unreadCount: 1,
        isOnline: false,
        messages: [
          { id: 'm1', conversationId: 'notif-smart-1', senderId: 'system', isMe: false, text: '[ALERTE DÉBAT INTELLIGENT] L\'Auteur "Vision2026" que vous avez contredit génère une quantité inhabituelle de trafic dans votre secteur d\'information. Son intervention compte 523 commentaires.', timestamp: '18:00', status: 'read' },
          { id: 'm2', conversationId: 'notif-smart-1', senderId: 'system', isMe: false, text: '👉 Vous pouvez retourner au débat depuis l\'article pour maintenir votre influence territoriale.', timestamp: '18:00', status: 'read' }
        ]
      },
      {
        id: 'admin-1',
        type: 'admin',
        sender: 'Administration Centrale',
        fallbackInitials: 'ADM',
        lastMessage: 'Sécurité : Nouvelle validation de vos clés.',
        timestamp: '09:00',
        unreadCount: 0,
        isVerified: true,
        messages: [
          { id: 'm1', conversationId: 'admin-1', senderId: 'system', isMe: false, text: '[MESSAGE AUTOMATIQUE DU SYSTÈME] Remplacement de vos paires de clés asymétriques effectué avec succès. Vos transmissions passées et futures utilisent la cryptographie AES-256.', timestamp: '09:00', status: 'read' }
        ]
      }
    ];

    for (const chat of mocks) {
      await setDoc(doc(db, this.collectionName, chat.id), chat);
    }
  }
}
