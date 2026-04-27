import { Injectable, signal, effect, inject } from '@angular/core';
import { Article, Comment as CakeComment } from '../types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  articles = signal<Article[]>([]);
  private channel: RealtimeChannel | null = null;
  public isConnected = signal<boolean>(true); // To manually track if DB connected
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private supabaseService = inject(SupabaseService);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.startRealtimeSync();
      } else {
        if (this.channel) {
          this.supabaseService.client.removeChannel(this.channel);
          this.channel = null;
        }
        this.articles.set([]);
      }
    });
  }

  private async startRealtimeSync() {
    if (this.channel) {
      await this.supabaseService.client.removeChannel(this.channel);
    }

    try {
      // First fetch
      const { data, error } = await this.supabaseService.client.from('articles').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      
      this.articles.set((data as Article[]) || []);
      this.isConnected.set(true);

      // Listen to changes
      this.channel = this.supabaseService.client.channel('public:articles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, (payload) => {
           // Handle insert, update, delete
           if (payload.eventType === 'INSERT') {
             this.articles.update(curr => [payload.new as Article, ...curr].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
           } else if (payload.eventType === 'UPDATE') {
             this.articles.update(curr => curr.map(a => a.id === payload.new['id'] ? payload.new as Article : a).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
           } else if (payload.eventType === 'DELETE') {
             this.articles.update(curr => curr.filter(a => a.id !== payload.old['id']));
           }
        })
        .subscribe();
    } catch(e) {
      console.error("Supabase Error starting sync:", e);
      this.isConnected.set(false);
    }
  }

  async getArticles(): Promise<Article[]> {
    return this.articles();
  }

  async upsertArticle(article: Article): Promise<Article | null> {
    try {
      const { data, error } = await this.supabaseService.client.from('articles').upsert(article).select().single();
      if (error) throw error;
      return data as Article;
    } catch(e: any) {
       console.error("Supabase create error", e);
       return null;
    }
  }

  async deleteArticle(articleId: string): Promise<void> {
    try {
      await this.supabaseService.client.from('articles').delete().eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase delete error", e);
    }
  }

  // --- Real-time Interactions ---

  async likeArticle(articleId: string) {
    try {
      const { data, error } = await this.supabaseService.client.from('articles').select('likes').eq('id', articleId).single();
      if (error) throw error;
      await this.supabaseService.client.from('articles').update({ likes: (data.likes || 0) + 1 }).eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase update error", e);
    }
  }

  async updateVibe(articleId: string, currentVibeCheck: any) {
    try {
      await this.supabaseService.client.from('articles').update({ vibeCheck: currentVibeCheck }).eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase vibe error", e);
    }
  }

  async addComment(articleId: string, comment: CakeComment) {
    try {
      const { data: art, error } = await this.supabaseService.client.from('articles').select('comments, roomComments').eq('id', articleId).single();
      if (error) throw error;
      
      const newCommentsCount = (art.comments || 0) + 1;
      const newRoomComments = [...(art.roomComments || []), comment];

      await this.supabaseService.client.from('articles').update({
        comments: newCommentsCount,
        roomComments: newRoomComments
      }).eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase comment error", e);
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    // Rely strictly on public publicProfiles if not the user themselves
    const publicProfile = await this.userService.fetchPublicProfile(userId);
    if (publicProfile) {
        return {
           id: publicProfile.uid,
           name: publicProfile.displayName,
           handle: publicProfile.username || 'user',
           avatar: publicProfile.photoURL || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + publicProfile.displayName,
           role: 'USER', // We don't expose role in public profile for security
           status: 'ACTIVE',
           joinDate: publicProfile.updatedAt || new Date().toISOString()
        };
    }
    return null;
  }
}

