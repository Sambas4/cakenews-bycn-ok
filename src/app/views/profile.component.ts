import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Category } from '../types';
import { CATEGORIES, CATEGORY_COLORS, getTextColor } from '../constants';
import { InteractionService } from '../services/interaction.service';
import { TranslationService } from '../services/translation.service';
import { ModalService } from '../services/modal.service';
import { Router } from '@angular/router';

type ProfileTab = 'identity' | 'zone' | 'prefs';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="w-full h-full relative bg-black overflow-hidden flex flex-col hide-scrollbar">
      <!-- STATIC HEADER & TABS -->
      <div class="sticky top-0 z-[50] flex flex-col transform-gpu">
        <div class="bg-black/95 border-b border-white/5 pt-12 backdrop-blur-sm supports-[backdrop-filter]:bg-black/80">
          <div class="px-8 pb-6 flex items-center justify-between">
            <h1 class="text-3xl font-[1000] uppercase tracking-normal text-white">Profil</h1>
            <button (click)="logout()" class="p-2 bg-zinc-900 border border-white/10 rounded-full hover:border-[#ff0000] hover:text-[#ff0000] transition-colors">
              <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
            </button>
          </div>
          
          <div class="flex justify-around items-center">
            @for (tab of tabs; track tab.id) {
              <button 
                (click)="activeTab = tab.id" 
                class="flex flex-col items-center gap-1.5 py-4 transition-all duration-75 relative flex-1 active:scale-98 touch-manipulation cursor-pointer"
                [ngClass]="activeTab === tab.id ? 'text-white' : 'text-white/20'"
              >
                <lucide-icon [name]="tab.icon" class="w-4 h-4"></lucide-icon>
                <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{tab.label}}</span>
                @if (activeTab === tab.id) {
                  <div class="absolute bottom-0 left-4 right-4 h-[2px] bg-sky-500"></div>
                }
              </button>
            }
          </div>
        </div>
      </div>

      <!-- SCROLLABLE CONTENT -->
      <div class="flex-1 overflow-y-auto hide-scrollbar relative bg-black px-8 pt-8 pb-32">
        @if (activeTab === 'identity') {
          <div class="flex flex-col gap-6">
            <!-- CARTE D'IDENTITÉ -->
            <div class="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex items-center gap-6">
              <div class="w-20 h-20 shrink-0 rounded-full border-2 border-white/10 overflow-hidden">
                 <img src="https://i.pravatar.cc/150?u=current" referrerpolicy="no-referrer" class="w-full h-full object-cover relative z-10" />
              </div>
              <div class="flex flex-col z-10">
                <h2 class="text-2xl font-[1000] uppercase leading-none mb-1 text-white">Alex Carter</h2>
                <div class="flex items-center gap-2 mt-2">
                  <span class="px-2 py-0.5 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-sm" [style.backgroundColor]="rank().color">
                      {{rank().label}}
                  </span>
                </div>
              </div>
            </div>

            <!-- TRUST SCORE -->
            <div class="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 flex flex-col items-center">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">Trust Score</span>
              <div class="text-4xl font-[1000] mb-3" [ngClass]="userStats().trustScore > 80 ? 'text-emerald-500' : 'text-white'">
                 {{userStats().trustScore}}%
              </div>
              <div class="w-full bg-black rounded-full h-1.5">
                 <div class="bg-emerald-500 h-1.5 rounded-full" [style.width]="userStats().trustScore + '%'"></div>
              </div>
            </div>

            <!-- DATA ROW -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                <lucide-icon name="message-square" class="w-4 h-4 mb-2 text-white/40"></lucide-icon>
                <span class="text-lg font-[1000] text-white">{{userStats().commentsPosted}}</span>
                <span class="text-[8px] font-bold text-white/40 uppercase tracking-widest">Débats</span>
              </div>
              <div class="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                <lucide-icon name="heart" class="w-4 h-4 mb-2 text-sky-500"></lucide-icon>
                <span class="text-lg font-[1000] text-white">{{userStats().likesReceived}}</span>
                <span class="text-[8px] font-bold text-white/40 uppercase tracking-widest">Reçus</span>
              </div>
            </div>
            
            <button (click)="openModal('HALL_OF_FAME')" class="w-full py-4 bg-zinc-900/80 border border-[#ffd700]/30 rounded-2xl flex items-center justify-center gap-2 text-[#ffd700] active:scale-95 transition-all">
              <lucide-icon name="trophy" class="w-4 h-4"></lucide-icon>
              <span class="text-[10px] font-black uppercase tracking-[0.2em]">Registres Hall of Fame</span>
            </button>
          </div>
        }

        @if (activeTab === 'zone') {
          <div class="flex flex-col gap-6">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full bg-sky-500"></div>
              <h3 class="text-xs font-black uppercase tracking-widest text-white/70">Ancrage Territorial</h3>
            </div>

            <div class="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 transition-all" [ngClass]="isEditingLoc ? 'border-sky-500/50' : ''">
              @if (!userLocation().isSet || isEditingLoc) {
                <div class="space-y-4">
                  <p class="text-[11px] font-medium text-white/60 leading-relaxed mb-4">Ces données permettent de cibler précisément l'information locale et de certifier votre présence dans cette zone rattachée.</p>
                  
                  <div class="space-y-2">
                    <input type="text" [(ngModel)]="locForm.country" placeholder="Pays" class="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-sky-500" />
                    <input type="text" [(ngModel)]="locForm.city" placeholder="Ville" class="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-sky-500" />
                    <input type="text" [(ngModel)]="locForm.neighborhood" placeholder="Quartier / Arrondissement" class="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-sky-500" />
                  </div>
                  
                  <button 
                    (click)="handleSaveLoc()"
                    [disabled]="!locForm.city || !locForm.neighborhood"
                    class="w-full py-4 bg-sky-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    Valider le secteur
                  </button>
                </div>
              } @else {
                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-2xl font-[1000] text-white uppercase tracking-tighter">{{userLocation().neighborhood}}</span>
                    <span class="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-1">{{userLocation().city}}, {{userLocation().country}}</span>
                  </div>
                  <button (click)="isEditingLoc = true" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white">
                    <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon>
                  </button>
                </div>
              }
            </div>
            
            <div class="p-4 border border-sky-500/20 bg-sky-500/5 rounded-2xl flex gap-3 items-start mt-4">
              <lucide-icon name="info" class="w-4 h-4 text-sky-500 shrink-0 mt-0.5"></lucide-icon>
              <p class="text-[10px] text-white/60 leading-relaxed font-medium">L'algorithme priorisera désormais les investigations géolocalisées sur votre secteur validé.</p>
            </div>
          </div>
        }

        @if (activeTab === 'prefs') {
          <div class="flex flex-col gap-6">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full bg-white"></div>
              <h3 class="text-xs font-black uppercase tracking-widest text-white/70">Filtres Algorithmiques</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              @for (cat of CATEGORIES; track cat) {
                <button
                  (click)="togglePref(cat)"
                  class="p-4 rounded-2xl font-[1000] uppercase text-[10px] tracking-widest border transition-all flex flex-col items-start gap-4 text-left relative overflow-hidden"
                  [ngClass]="preferences().includes(cat) ? getTextColor(cat) + ' border-transparent' : 'bg-zinc-900/40 border-white/5 text-white/40'"
                  [style.backgroundColor]="preferences().includes(cat) ? getCategoryColor(cat) : undefined"
                >
                  <div class="flex w-full justify-between items-center">
                    <lucide-icon [name]="getIconForCategory(cat)" class="w-4 h-4"></lucide-icon>
                    @if (preferences().includes(cat)) {
                      <div class="w-2 h-2 rounded-full" [ngClass]="getTextColor(cat) === 'text-black' ? 'bg-black' : 'bg-white'"></div>
                    }
                  </div>
                  <span>{{t()('CAT_' + cat.toUpperCase(), cat)}}</span>
                </button>
              }
            </div>
            
            <div class="w-full h-px bg-white/10 my-4"></div>
            
            <button class="w-full bg-zinc-900/40 border border-white/5 hover:border-white/20 text-white p-5 rounded-2xl flex justify-between items-center text-[10px] font-black uppercase tracking-widest transition-colors mb-2">
                Archives d'investigations <lucide-icon name="chevron-right" class="w-4 h-4 text-white/40"></lucide-icon>
            </button>
            <button class="w-full bg-zinc-900/40 border border-white/5 hover:border-white/20 text-white p-5 rounded-2xl flex justify-between items-center text-[10px] font-black uppercase tracking-widest transition-colors">
                Traces d'activité <lucide-icon name="chevron-right" class="w-4 h-4 text-white/40"></lucide-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileViewComponent implements OnInit {
  private interaction = inject(InteractionService);
  private translation = inject(TranslationService);
  private modal = inject(ModalService);
  private router = inject(Router);

  t = this.translation.t;
  CATEGORIES = CATEGORIES;
  
  userLocation = this.interaction.userLocation;
  userStats = this.interaction.userStats;
  preferences = this.interaction.userInterests;

  activeTab: ProfileTab = 'identity';

  tabs: {id: ProfileTab, label: string, icon: string}[] = [
    { id: 'identity', label: 'Identité', icon: 'user' },
    { id: 'zone', label: 'Zone', icon: 'map-pin' },
    { id: 'prefs', label: 'Réglages', icon: 'sliders' }
  ];

  isEditingLoc = false;
  locForm = { neighborhood: '', city: '', country: 'Gabon' };

  rank = computed(() => {
    const score = this.userStats().likesGiven + (this.userStats().commentsPosted * 5);
    if (score > 1000) return { label: 'Maître Débatteur', color: '#ffcc00' };
    if (score > 500) return { label: 'Influenceur', color: '#00f0ff' };
    if (score > 100) return { label: 'Initié', color: '#22c55e' };
    return { label: 'Observateur', color: '#ffffff' };
  });

  ngOnInit() {
    this.locForm = {
      neighborhood: this.userLocation().neighborhood,
      city: this.userLocation().city,
      country: this.userLocation().country || 'Gabon'
    };
    this.isEditingLoc = !this.userLocation().isSet;
  }

  handleSaveLoc() {
    if(this.locForm.neighborhood && this.locForm.city) {
        this.interaction.updateUserLocation(this.locForm);
        this.isEditingLoc = false;
    }
  }

  togglePref(cat: Category) {
    this.interaction.toggleUserInterest(cat);
  }

  logout() {
    this.router.navigate(['/auth']);
  }

  openModal(type: any) {
    this.modal.openModal(type);
  }

  getTextColor(cat: Category) {
    return getTextColor(cat);
  }

  getCategoryColor(cat: Category) {
    return CATEGORY_COLORS[cat];
  }

  getIconForCategory(cat: string): string {
    const mapping: Record<string, string> = {
      'tech': 'cpu',
      'politique': 'globe',
      'economie': 'trending-up',
      'ecologie': 'leaf',
      'culture': 'star',
      'societe': 'users',
      'sante': 'activity',
      'divertissement': 'video'
    };
    return mapping[cat.toLowerCase()] || 'hash';
  }
}
