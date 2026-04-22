import { Injectable, inject, untracked } from '@angular/core';
import { Article, Category } from '../types';
import { InteractionService } from './interaction.service';

export interface FeedArticleStats {
  score: number;
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FeedEngineService {
  private interaction = inject(InteractionService);

  private adjacencyMap: Record<string, Category[]> = {
    'Tech': ['IA', 'Science', 'Startups', 'Gaming', 'Espace', 'Crypto'],
    'IA': ['Tech', 'Science', 'Startups', 'Économie'],
    'Politique': ['Économie', 'International', 'Société', 'Justice'],
    'Football': ['NBA', 'F1', 'MMA', 'Real Madrid', 'FC Barcelone', 'PSG', 'OM'],
    'Culture': ['Cinéma', 'Musique', 'Mode', 'Architecture'],
    'Startups': ['Tech', 'Économie', 'IA'],
    'Environnement': ['Science', 'Politique', 'Espace', 'Société'],
    'Justice': ['Faits Divers', 'Société', 'Politique'],
    'Voyage': ['Culture', 'Food', 'Architecture'],
    'Food': ['Voyage', 'Culture', 'Mode'],
    'Gaming': ['Tech', 'Manga', 'Musique'],
    'Manga': ['Gaming', 'Cinéma', 'Tech'],
  };

  /**
   * Génère le feed adaptatif. 
   * On utilise untracked() pour s'assurer que cette fonction pure ne crée pas
   * de boucles de réactivité avec les micro-signaux (ce qui regénèrerait le composant à chaque swipe).
   */
  public generateAdaptiveFeed(allArticles: Article[]): Article[] {
    if (!allArticles || allArticles.length === 0) return [];

    return untracked(() => {
      // 1. Calcul du Graph d'Affinité Profond (Multi-Dimensionnel)
      const affinity = this.buildDeepAffinity(allArticles);

      // 2. Scoring strict de l'inventaire
      const scoredPool = allArticles.map(article => {
        const { score, tags } = this.calculateMultiDimensionalScore(article, affinity, allArticles);
        return { article, score, tags };
      });

      // 3. Filtrage des contenus cramés (Fatigue extrême ou déjà consommés)
      // On tolère un score plus bas si l'inventaire est faible, mais on élimine les très négatifs.
      const candidates = scoredPool.filter(item => item.score > -20);
      
      // Sécurité : si l'inventaire est trop restreint, on renvoie tout simplement trié par score.
      if (candidates.length < 10) {
          return candidates.sort((a,b) => b.score - a.score).map(c => c.article);
      }

      // 4. Catégorisation comportementale
      const safeHits = candidates.filter(c => c.tags.includes('SAFE')).sort((a, b) => b.score - a.score);
      const adjacents = candidates.filter(c => c.tags.includes('ADJACENT')).sort((a, b) => b.score - a.score);
      const explorations = candidates.filter(c => c.tags.includes('EXPLORE') || c.tags.includes('BREAK')).sort((a, b) => b.score - a.score);

      // 5. Opération de mixage algorithmique (Patterning)
      const finalFeed: Article[] = [];
      const usedIds = new Set<string>();
      const targetSize = Math.min(candidates.length, 50); 
      
      const pattern = ['S', 'S', 'A', 'S', 'E', 'S', 'A', 'S', 'S', 'E'];
      let ptr = 0;
      let safeIdx = 0, adjIdx = 0, expIdx = 0;
      
      let prevCat: string | null = null;
      let prePrevCat: string | null = null; // Protection stricte contre 3 consécutifs
      
      const pull = (pool: any[], startIdx: number) => {
        for (let i = startIdx; i < pool.length; i++) {
          const item = pool[i].article;
          if (!usedIds.has(item.id)) {
            // Anti-répétition lourde
            if ((item.category === prevCat && item.category === prePrevCat) && pool.length > 3) {
              continue; 
            }
            return { item: pool[i], newIdx: i + 1 };
          }
        }
        return { item: undefined, newIdx: startIdx };
      };

      while (finalFeed.length < targetSize) {
        const t = pattern[ptr % pattern.length];
        let p;

        if (t === 'S') { p = pull(safeHits, safeIdx); safeIdx = p.newIdx; if(!p.item) { p = pull(adjacents, adjIdx); adjIdx = p.newIdx; } }
        else if (t === 'A') { p = pull(adjacents, adjIdx); adjIdx = p.newIdx; if(!p.item) { p = pull(safeHits, safeIdx); safeIdx = p.newIdx; } }
        else if (t === 'E') { p = pull(explorations, expIdx); expIdx = p.newIdx; if(!p.item) { p = pull(safeHits, safeIdx); safeIdx = p.newIdx; } }

        if (p?.item) {
          finalFeed.push(p.item.article);
          usedIds.add(p.item.article.id);
          prePrevCat = prevCat;
          prevCat = p.item.article.category;
        } else {
          // S'il ne trouve plus rien en respectant le pattern, on coupe la boucle pour éviter l'infini.
          break;
        }
        ptr++;
      }

      // 6. Remplissage si le pattern a drainé les flux primaires mais qu'il reste des candidats
      if (finalFeed.length < targetSize) {
         for (const c of candidates.sort((a,b)=>b.score - a.score)) {
             if (finalFeed.length >= targetSize) break;
             if (!usedIds.has(c.article.id)) {
                 finalFeed.push(c.article);
                 usedIds.add(c.article.id);
             }
         }
      }

      return finalFeed;
    });
  }

  /**
   * Construit une carte d'affinité multi-dimensionnelle (Catégories, Tons, Formats, Complexité)
   */
  private buildDeepAffinity(allArticles: Article[]) {
      const categoryAffinity: Record<string, number> = {};
      const toneAffinity: Record<string, number> = {};
      const formatAffinity: Record<string, number> = {};
      const complexityAffinity: Record<string, number> = {};

      const interests = this.interaction.userInterests();
      const likes = this.interaction.likedArticles();
      const saves = this.interaction.savedArticles();
      const reads = this.interaction.readArticles();
      const comments = this.interaction.commentedArticles?.() || [];

      // Base : Intérêts statiques
      interests.forEach(i => categoryAffinity[i] = (categoryAffinity[i] || 0) + 15);

      const addWeight = (id: string, weight: number) => {
          const article = allArticles.find(a => a.id === id);
          if (!article) return;
          categoryAffinity[article.category] = (categoryAffinity[article.category] || 0) + weight;
          
          if (article.metadata) {
             const m = article.metadata;
             toneAffinity[m.tone] = (toneAffinity[m.tone] || 0) + weight;
             formatAffinity[m.format] = (formatAffinity[m.format] || 0) + weight;
             complexityAffinity[m.complexity] = (complexityAffinity[m.complexity] || 0) + weight;
          }
      };

      saves.forEach(id => addWeight(id, 20));
      comments.forEach(id => addWeight(id, 25));
      likes.forEach(id => addWeight(id, 10));
      reads.forEach(id => addWeight(id, 2));

      return { categoryAffinity, toneAffinity, formatAffinity, complexityAffinity };
  }

  private calculateMultiDimensionalScore(article: Article, affinity: any, allArticles: Article[]): FeedArticleStats {
    let score = 0;
    const tags: string[] = [];

    const readHistory = this.interaction.readArticles();
    const likedHistory = this.interaction.likedArticles();
    const sessionHistory = this.interaction.sessionHistory();

    // -- 1. STATUT PROFOND (DYNAMIQUE) --
    let directAffinity = affinity.categoryAffinity[article.category] || 0;
    
    // Ajout des signaux métadonnées si existants
    if (article.metadata) {
        const m = article.metadata;
        const toneScore = affinity.toneAffinity[m.tone] || 0;
        const formatScore = affinity.formatAffinity[m.format] || 0;
        // On moyenne un peu le signal sémantique pour avoir la vraie trace cognitive
        directAffinity += (toneScore * 0.5) + (formatScore * 0.3);
    }
    
    // Détermination de l'adjacence basée sur les "Top Tiers" catégories de l'utilisateur
    const topCategories = Object.entries(affinity.categoryAffinity)
                            .sort((a: any,b: any) => b[1] - a[1])
                            .slice(0, 3)
                            .map(x => x[0]);
    
    const isAdjacent = topCategories.some(topCat => this.adjacencyMap[topCat]?.includes(article.category));

    if (directAffinity > 25) {
      score += Math.min(directAffinity, 70); // Les tops intimes (Catégorie + Bon Ton + Bon Format)
      tags.push('SAFE');
    } else if (isAdjacent) {
      score += 15;
      // Bonus si l'adjacence a au moins la bonne forme/texture mentale
      if (article.metadata && (affinity.toneAffinity[article.metadata.tone] > 10)) {
         score += 15; // "C'est un sujet adjacent, mais raconté avec ton Ton préféré" -> Jackpot de découverte
         tags.push('CROSS_EXPLORE_MATCH');
      }
      tags.push('ADJACENT');
    } else {
      if (['Humour', 'People', 'Faits Divers', 'Manga'].includes(article.category)) {
          score += 5;
          tags.push('BREAK');
      } else {
          tags.push('EXPLORE');
      }
    }

    // -- 2. PÉNALITÉS DE CONSOMMATION --
    // L'objectif n'est pas de montrer un feed rempli de trucs qu'il a déjà vu
    if (readHistory.includes(article.id)) {
      score -= 30; // Pénalité pour les lus (Il l'a déjà vu, on le downgrade fortement)
      tags.push('READ_ALREADY');
    }
    if (likedHistory.includes(article.id) || this.interaction.savedArticles().includes(article.id)) {
      score -= 60; // Dégage totalement les trucs qu'il a déjà liké ou sauvé de son Feed d'exploration (il les a dans son profil).
    }

    // -- 3. ÉTAT DU MOMENT & FATIGUE (Dwell Time Analysis) --
    const recentActivity = sessionHistory.slice(-15);
    
    // Fatigue Catégorielle
    const catViews = recentActivity.filter(h => h.category === article.category);
    if (catViews.length > 3) {
      score -= 15 * (catViews.length - 2); 
      tags.push('FATIGUE_CATEGORY');
    }

    // NOUVEAU: Fatigue de Texture (Format)
    if (article.metadata) {
       const recentFormats = recentActivity.filter(h => {
          const histArticle = allArticles.find(a => a.id === h.articleId);
          return histArticle?.metadata?.format === article.metadata!.format;
       });
       
       if (recentFormats.length > 4) {
          // L'utilisateur vient de se manger 4 contenus du même format de suite, il sature.
          score -= 20; 
          tags.push('FATIGUE_FORMAT');
       }
    }

    // Zapping (Skip)
    const recentSkips = catViews.filter(h => (h.completionRatio ?? 1) < 0.2 && h.durationMs < 2000);
    if (recentSkips.length > 0) {
      // S'il a zappé récemment des articles de cette catégorie, on le pénalise brutalement.
      score -= 25 * recentSkips.length; 
      tags.push('RECENTLY_SKIPPED');
    }

    // Deep Engagement (Hyper focus récent) : A lu plus de 80% du temps estimé
    const recentDeepReads = catViews.filter(h => (h.completionRatio ?? 0) > 0.8 || h.durationMs > 15000);
    if (recentDeepReads.length > 0) {
      // S'il est scotché sur une catégorie EN CE MOMENT, on pousse à fond.
      score += 20 * recentDeepReads.length;
      tags.push('DEEP_ENGAGEMENT_BOOST');
    }

    return { score, tags };
  }
}
