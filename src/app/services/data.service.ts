import { Injectable, signal, effect, inject } from '@angular/core';
import { MOCK_ARTICLES, MOCK_USERS } from '../data/mockData';
import { Article, UserData, Comment as CakeComment } from '../types';
import { collection, doc, setDoc, deleteDoc, onSnapshot, increment, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase.service';
import { handleFirestoreError } from '../utils/firestore-error-handler';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  articles = signal<Article[]>([]);
  private unsubscribeArticles: (() => void) | null = null;
  public isConnected = signal<boolean>(true); // To manually track if DB connected
  private authService = inject(AuthService);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.startRealtimeSync();
      } else {
        if (this.unsubscribeArticles) {
          this.unsubscribeArticles();
          this.unsubscribeArticles = null;
        }
        this.articles.set([]);
      }
    });
  }

  private startRealtimeSync() {
    if (this.unsubscribeArticles) {
      this.unsubscribeArticles();
    }
    
    const articlesCol = collection(db, 'articles');
    
    // onSnapshot sets up a continuous websocket connection to listen for updates in real time
    this.unsubscribeArticles = onSnapshot(articlesCol, 
      (snapshot) => {
        this.isConnected.set(true);
        const articleList = snapshot.docs.map(doc => doc.data() as Article);
        
        // Sort articles by timestamp before pushing to app view (newest first)
        const sorted = articleList.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Set up fallback for hydration mock data:
        if (sorted.length > 0) {
          this.articles.set(sorted);
          this.saveToStorage(sorted);
        } else {
          // If empty in DB (e.g. brand new project), hydrate with mock data once:
          this.articles.set(MOCK_ARTICLES);
          // Allow hydration specifically if admin or in test mode, but don't crash the UI if it fails
          Promise.allSettled(MOCK_ARTICLES.map(art => this.upsertArticle(art))).then(results => {
              const failures = results.filter(r => r.status === 'rejected');
              if (failures.length > 0) {
                  console.warn("Hydration partially or totally failed due to permissions, falling back to local memory articles.", failures);
              }
          });
        }
      },
      (error) => {
        console.error("Firebase Snapshot Error (Offline?):", error);
        this.isConnected.set(false);
        // Fallback offline mode reading from local storage
        const stored = localStorage.getItem('cakenews_articles');
        if (stored) {
          try {
            this.articles.set(JSON.parse(stored));
          } catch(e) {}
        }
      }
    );
  }

  private saveToStorage(data: Article[]) {
    localStorage.setItem('cakenews_articles', JSON.stringify(data));
  }

  async getArticles(): Promise<Article[]> {
    return this.articles();
  }

  async upsertArticle(article: Article): Promise<Article | null> {
    try {
      const docRef = doc(db, 'articles', article.id);
      await setDoc(docRef, article);
      // Wait for the onSnapshot listener to update the state...
      return article;
    } catch(e: any) {
       handleFirestoreError(e, 'create', `articles/${article.id}`);
       return null;
    }
  }

  async deleteArticle(articleId: string): Promise<void> {
    try {
      const docRef = doc(db, 'articles', articleId);
      await deleteDoc(docRef);
    } catch(e) {
      console.error("Error deleting article:", e);
    }
  }

  // --- Real-time Interactions ---

  async likeArticle(articleId: string) {
    try {
      const docRef = doc(db, 'articles', articleId);
      await updateDoc(docRef, {
        likes: increment(1)
      });
    } catch(e: any) {
      handleFirestoreError(e, 'update', `articles/${articleId}`);
    }
  }

  async updateVibe(articleId: string, currentVibeCheck: any) {
    try {
      const docRef = doc(db, 'articles', articleId);
      await updateDoc(docRef, {
        vibeCheck: currentVibeCheck
      });
    } catch(e: any) {
      handleFirestoreError(e, 'update', `articles/${articleId}`);
    }
  }

  async addComment(articleId: string, comment: CakeComment) {
    try {
      const docRef = doc(db, 'articles', articleId);
      await updateDoc(docRef, {
        comments: increment(1),
        roomComments: arrayUnion(comment) // Push comment to the end of the array
      });
    } catch(e: any) {
      handleFirestoreError(e, 'update', `articles/${articleId}`);
    }
  }

  async getUserProfile(userId: string): Promise<UserData | null> {
    return MOCK_USERS.find(u => u.id === userId) || null;
  }
}

