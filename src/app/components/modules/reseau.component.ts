import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import type { Article } from '../../types';

@Component({
  selector: 'app-reseau-module',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-6 p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-2 h-2 rounded-full" [style.backgroundColor]="accentColor"></div>
        <h3 class="text-xs font-black uppercase tracking-widest text-white/70">Impact Réseau</h3>
      </div>
      
      <!-- Primary Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
          <lucide-icon name="heart" class="w-6 h-6 text-white/50"></lucide-icon>
          <span class="text-2xl font-black text-white">{{article.likes || 0}}</span>
          <span class="text-[10px] uppercase tracking-widest text-white/40">J'aime</span>
        </div>
        
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
          <lucide-icon name="message-circle" class="w-6 h-6 text-white/50"></lucide-icon>
          <span class="text-2xl font-black text-white">{{article.roomComments?.length || 0}}</span>
          <span class="text-[10px] uppercase tracking-widest text-white/40">Avis</span>
        </div>
      </div>

      <!-- Mood -->
      <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Mood</h4>
        <div class="flex justify-between items-end h-24 gap-2">
          <div class="flex flex-col items-center gap-2 flex-1">
            <span class="text-xs font-bold text-white">{{getVibePercent('choque')}}%</span>
            <div class="w-full bg-zinc-800 rounded-t-sm relative flex items-end justify-center" [style.height]="getVibePercent('choque') + '%'">
              <div class="w-full bg-red-500/80 rounded-t-sm absolute bottom-0" [style.height]="'100%'"></div>
            </div>
            <span class="text-[9px] uppercase tracking-wider text-white/50">Choqué</span>
          </div>
          <div class="flex flex-col items-center gap-2 flex-1">
            <span class="text-xs font-bold text-white">{{getVibePercent('sceptique')}}%</span>
            <div class="w-full bg-zinc-800 rounded-t-sm relative flex items-end justify-center" [style.height]="getVibePercent('sceptique') + '%'">
              <div class="w-full bg-yellow-500/80 rounded-t-sm absolute bottom-0" [style.height]="'100%'"></div>
            </div>
            <span class="text-[9px] uppercase tracking-wider text-white/50">Sceptique</span>
          </div>
          <div class="flex flex-col items-center gap-2 flex-1">
            <span class="text-xs font-bold text-white">{{getVibePercent('bullish')}}%</span>
            <div class="w-full bg-zinc-800 rounded-t-sm relative flex items-end justify-center" [style.height]="getVibePercent('bullish') + '%'">
              <div class="w-full bg-blue-500/80 rounded-t-sm absolute bottom-0" [style.height]="'100%'"></div>
            </div>
            <span class="text-[9px] uppercase tracking-wider text-white/50">Bullish</span>
          </div>
          <div class="flex flex-col items-center gap-2 flex-1">
            <span class="text-xs font-bold text-white">{{getVibePercent('valide')}}%</span>
            <div class="w-full bg-zinc-800 rounded-t-sm relative flex items-end justify-center" [style.height]="getVibePercent('valide') + '%'">
              <div class="w-full bg-green-500/80 rounded-t-sm absolute bottom-0" [style.height]="'100%'"></div>
            </div>
            <span class="text-[9px] uppercase tracking-wider text-white/50">Validé</span>
          </div>
        </div>
      </div>
      
      <!-- Detailed Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/40">Vues</span>
          <span class="text-lg font-black text-white">{{article.views || 0 | number}}</span>
        </div>
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/40">Taux de lecture</span>
          <span class="text-lg font-black text-white">{{article.readRate || 0}}%</span>
        </div>
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/40">Temps moyen</span>
          <span class="text-lg font-black text-white">{{article.avgTime || '0:00'}}</span>
        </div>
        <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/40">Viralité</span>
          <span class="text-lg font-black text-white">{{article.virality || 0}}x</span>
        </div>
      </div>

      <!-- Trust & Safety -->
      <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-white/40">Trust & Safety</h4>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <lucide-icon name="alert-triangle" class="w-4 h-4 text-yellow-500"></lucide-icon>
            <span class="text-sm text-white/80">Signalements</span>
          </div>
          <span class="text-sm font-bold text-white">{{article.reports || 0}}</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <lucide-icon name="shield-alert" class="w-4 h-4 text-red-500"></lucide-icon>
            <span class="text-sm text-white/80">Contestations</span>
          </div>
          <span class="text-sm font-bold text-white">{{article.disputes || 0}}</span>
        </div>
        @if (article.certifiedBy) {
          <div class="mt-2 pt-3 border-t border-white/10 flex items-center gap-2">
            <lucide-icon name="shield-check" class="w-4 h-4 text-green-500"></lucide-icon>
            <span class="text-xs text-white/60">Certifié par <strong class="text-white">{{article.certifiedBy}}</strong></span>
          </div>
        }
      </div>
      
      <div class="mt-4 pt-6 border-t border-white/10 flex flex-col gap-4">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-white/40">Auteur de l'audit</h4>
        <div class="flex items-center gap-4">
          <img [src]="'https://i.pravatar.cc/150?u=' + article.author" referrerpolicy="no-referrer" [alt]="article.author" class="w-12 h-12 rounded-full border-2" [style.borderColor]="accentColor" />
          <div class="flex flex-col">
            <span class="text-base font-bold text-white">{{article.author}}</span>
            <span class="text-xs text-white/50">Auditeur Certifié</span>
          </div>
          <button class="ml-auto px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-white active:scale-95 transition-transform">
            Suivre
          </button>
        </div>
      </div>
    </div>
  `
})
export class ReseauModuleComponent {
  @Input() article!: Article;
  @Input() accentColor = '#ffffff';

  getVibePercent(vibeKey: 'choque' | 'sceptique' | 'bullish' | 'valide'): number {
    if (!this.article || !this.article.vibeCheck) return 0;
    const { choque, sceptique, bullish, valide } = this.article.vibeCheck;
    const total = choque + sceptique + bullish + valide;
    if (total === 0) return 0;
    return Math.round((this.article.vibeCheck[vibeKey] / total) * 100);
  }
}
