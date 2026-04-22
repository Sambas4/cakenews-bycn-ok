import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataService } from '../services/data.service';
import { ArticleCardComponent } from '../components/article-card.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ArticleCardComponent],
  template: `
    <div class="w-full h-full bg-black flex flex-col pt-12">
      <div class="px-6 shrink-0">
        <h1 class="text-2xl font-[1000] uppercase text-white tracking-tighter mb-6">Recherche</h1>
        
        <div class="relative mb-6">
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            placeholder="Sujets, articles, auteurs..." 
            class="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 text-white rounded-xl outline-none focus:border-white transition-colors"
          />
          <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"></lucide-icon>
          @if (searchQuery()) {
            <button (click)="searchQuery.set('')" class="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
            </button>
          }
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 pb-32">
        @if (!searchQuery()) {
          <div class="h-full flex flex-col items-center justify-center text-zinc-600">
            <lucide-icon name="search" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
            <p class="text-sm font-medium">Recherchez dans l'audit CakeNews</p>
            <div class="flex flex-wrap justify-center gap-2 mt-6">
              @for (tag of ['Tech', 'Politique', 'Économie', 'Société']; track tag) {
                <button (click)="searchQuery.set(tag)" class="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors uppercase">
                  #{{tag}}
                </button>
              }
            </div>
          </div>
        } @else {
          @if (searchResults().length === 0) {
            <div class="py-12 flex flex-col items-center text-zinc-600">
              <lucide-icon name="file-question" class="w-12 h-12 mb-4 opacity-50"></lucide-icon>
              <p class="text-sm font-medium">Aucun résultat trouvé pour "{{searchQuery()}}"</p>
            </div>
          } @else {
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold text-zinc-500 uppercase tracking-widest">{{searchResults().length}} résultat(s)</span>
            </div>
            <div class="space-y-6">
              @for (article of searchResults(); track article.id) {
                <div class="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors" (click)="goToArticle(article.id)">
                  <div class="h-32 w-full relative">
                    <img [src]="article.imageUrl" referrerpolicy="no-referrer" class="w-full h-full object-cover" alt="" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div class="absolute bottom-3 left-3">
                      <span class="text-[9px] font-black uppercase tracking-widest bg-white text-black px-1.5 py-0.5 rounded">{{article.category}}</span>
                    </div>
                  </div>
                  <div class="p-4">
                    <h3 class="text-white font-bold text-sm leading-tight mb-2">{{article.title}}</h3>
                    <p class="text-zinc-400 text-xs line-clamp-2">{{article.summary}}</p>
                    <div class="flex items-center gap-3 mt-4 text-[10px] font-mono text-zinc-500">
                      <span class="flex items-center gap-1"><lucide-icon name="heart" class="w-3 h-3"></lucide-icon> {{article.likes}}</span>
                      <span class="flex items-center gap-1"><lucide-icon name="message-square" class="w-3 h-3"></lucide-icon> {{article.comments}}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `
})
export class SearchViewComponent {
  private dataService = inject(DataService);
  private router = inject(Router);
  
  searchQuery = signal('');
  articles = this.dataService.articles;

  searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    return this.articles().filter(article => 
      article.title.toLowerCase().includes(query) || 
      article.summary.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.author.toLowerCase().includes(query)
    );
  });

  goToArticle(id: string) {
    this.router.navigate(['/article', id]);
  }
}
