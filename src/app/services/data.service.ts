import { Injectable, signal } from '@angular/core';
import { MOCK_ARTICLES, MOCK_USERS } from '../data/mockData';
import { Article, UserData } from '../types';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  articles = signal<Article[]>([]);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const stored = localStorage.getItem('cakenews_articles');
    if (stored) {
      try {
        this.articles.set(JSON.parse(stored));
      } catch (e) {
        console.error("Erreur de parsing des articles", e);
        this.articles.set(MOCK_ARTICLES);
      }
    } else {
      this.articles.set(MOCK_ARTICLES);
      this.saveToStorage(MOCK_ARTICLES);
    }
  }

  private saveToStorage(data: Article[]) {
    localStorage.setItem('cakenews_articles', JSON.stringify(data));
  }

  async getArticles(): Promise<Article[]> {
    return this.articles();
  }

  async upsertArticle(article: Article): Promise<Article | null> {
    this.articles.update(current => {
      const index = current.findIndex(a => a.id === article.id);
      let newArticles;
      if (index >= 0) {
        newArticles = [...current];
        newArticles[index] = article;
      } else {
        newArticles = [article, ...current];
      }
      this.saveToStorage(newArticles);
      return newArticles;
    });
    return article;
  }

  async deleteArticle(articleId: string): Promise<void> {
    this.articles.update(current => {
      const newArticles = current.filter(a => a.id !== articleId);
      this.saveToStorage(newArticles);
      return newArticles;
    });
  }

  async getUserProfile(userId: string): Promise<UserData | null> {
    return MOCK_USERS.find(u => u.id === userId) || null;
  }
}
