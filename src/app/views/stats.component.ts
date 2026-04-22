import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DataService } from '../services/data.service';
import { InteractionService } from '../services/interaction.service';
import { MOCK_USERS } from '../data/mockData';

@Component({
  selector: 'app-stats-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col h-full bg-black overflow-y-auto hide-scrollbar pb-32">
      <div class="p-8">
        <div class="flex items-center justify-between mb-10">
          <h1 class="text-3xl font-[1000] uppercase tracking-normal text-white">Statistiques</h1>
          <button class="p-3 border-2 border-white/10 bg-zinc-900 rounded-full text-white"><lucide-icon name="bar-chart-2" class="w-6 h-6"></lucide-icon></button>
        </div>

        <!-- Global Stats -->
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
            <lucide-icon name="file-text" class="w-8 h-8 text-sky-500 mb-2"></lucide-icon>
            <span class="text-3xl font-[1000] text-white">{{totalArticles()}}</span>
            <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Articles</span>
          </div>
          <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
            <lucide-icon name="users" class="w-8 h-8 text-green-500 mb-2"></lucide-icon>
            <span class="text-3xl font-[1000] text-white">{{totalUsers()}}</span>
            <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Utilisateurs</span>
          </div>
          <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
            <lucide-icon name="heart" class="w-8 h-8 text-red-500 mb-2"></lucide-icon>
            <span class="text-3xl font-[1000] text-white">{{totalLikes()}}</span>
            <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">J'aime</span>
          </div>
          <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
            <lucide-icon name="message-circle" class="w-8 h-8 text-yellow-500 mb-2"></lucide-icon>
            <span class="text-3xl font-[1000] text-white">{{totalComments()}}</span>
            <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Commentaires</span>
          </div>
        </div>

        <!-- Categories Breakdown -->
        <h2 class="text-xl font-[1000] uppercase tracking-normal text-white mb-6">Répartition par Catégorie</h2>
        <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 mb-8">
          <div class="flex flex-col gap-4">
            @for (cat of categoryStats(); track cat.name) {
              <div class="flex items-center gap-4">
                <span class="text-xs font-bold text-white w-20 truncate">{{cat.name}}</span>
                <div class="flex-1 bg-zinc-800 rounded-full h-2 relative">
                  <div class="bg-sky-500 h-2 rounded-full absolute left-0 top-0" [style.width]="cat.percentage + '%'"></div>
                </div>
                <span class="text-xs text-white/50 w-8 text-right">{{cat.count}}</span>
              </div>
            }
          </div>
        </div>

        <!-- Top Articles -->
        <h2 class="text-xl font-[1000] uppercase tracking-normal text-white mb-6">Articles les plus populaires</h2>
        <div class="flex flex-col gap-4 mb-8">
          @for (article of topArticles(); track article.id; let i = $index) {
            <div class="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-lg">
                #{{i + 1}}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-white truncate">{{article.title}}</h3>
                <div class="flex items-center gap-4 mt-1">
                  <div class="flex items-center gap-1 text-white/50 text-xs">
                    <lucide-icon name="heart" class="w-3 h-3"></lucide-icon>
                    <span>{{article.likes}}</span>
                  </div>
                  <div class="flex items-center gap-1 text-white/50 text-xs">
                    <lucide-icon name="message-circle" class="w-3 h-3"></lucide-icon>
                    <span>{{article.comments}}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Most Active Users -->
        <h2 class="text-xl font-[1000] uppercase tracking-normal text-white mb-6">Utilisateurs les plus actifs</h2>
        <div class="flex flex-col gap-4 mb-8">
          @for (user of topUsers(); track user.id; let i = $index) {
            <div class="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div class="relative">
                <img [src]="user.avatar" class="w-12 h-12 rounded-full object-cover border-2 border-zinc-800" />
                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                  {{i + 1}}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-white truncate">{{user.name}}</h3>
                <span class="text-xs text-white/50">{{user.handle}}</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-sm font-bold text-sky-400">{{user.stats.likesGiven + user.stats.commentsPosted}}</span>
                <span class="text-[8px] uppercase tracking-widest text-white/30">Score</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class StatsViewComponent {
  private dataService = inject(DataService);
  private interaction = inject(InteractionService);

  articles = computed(() => this.dataService.articles());
  users = MOCK_USERS;
  
  totalArticles = computed(() => this.articles().length);
  totalUsers = computed(() => this.users.length);
  
  totalLikes = computed(() => {
    return this.articles().reduce((sum, article) => sum + (article.likes || 0), 0);
  });

  totalComments = computed(() => {
    return this.articles().reduce((sum, article) => sum + (article.comments || 0), 0);
  });

  topArticles = computed(() => {
    return [...this.articles()]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 5);
  });

  topUsers = computed(() => {
    return [...this.users]
      .sort((a, b) => (b.stats.likesGiven + b.stats.commentsPosted) - (a.stats.likesGiven + a.stats.commentsPosted))
      .slice(0, 5);
  });

  categoryStats = computed(() => {
    const counts: Record<string, number> = {};
    this.articles().forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    
    const total = this.articles().length;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  });
}
