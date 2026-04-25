import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../firebase.config';

// 1. Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// 2. Export des instances pour les utiliser partout dans l'application
export const db = getFirestore(app);

// Activer le mode Oflfine (Cache Persistant) pour Firestore
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
  } else if (err.code == 'unimplemented') {
    console.warn("The current browser doesn't support all of the features required to enable persistence.");
  }
});

export const auth = getAuth(app);

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor() {
    this.testConnection();
  }

  private async testConnection() {
    try {
      // Tente de récupérer un document système pour vérifier si la base est activée
      await getDocFromServer(doc(db, 'system', 'connection-test'));
      console.log('🔥 [Firebase] Connecté avec succès !');
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        // C'est normal si on n'a pas accès, l'important c'est que la base a répondu
        console.log('🔥 [Firebase] Connecté avec succès (Accès restreint par les règles : OK) !');
      } else if (error?.message?.includes('offline') || error?.code === 'unavailable') {
        console.error('🔥 [Firebase] Erreur de connexion / Mode hors ligne.');
      } else if (error?.code === 'not-found') {
        console.warn('🔥 [Firebase] La base Firestore ne semble pas activée dans le projet.');
      } else {
        console.warn('🔥 [Firebase] Statut de connexion :', error.message);
      }
    }
  }
}
