import { Component, Input, Output, EventEmitter, inject, ViewChild, ElementRef, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BroadcastCampaign, BroadcastType, Article, ManualRankingEntry, Category, UserProfile } from '../../types';
import { CATEGORIES } from '../../constants';
import { BroadcastService } from '../../services/broadcast.service';
import { TranslationService } from '../../services/translation.service';

type ConsoleMode = 'MESSAGE' | 'RANKING';

const formatCompactNumber = (number: number) => {
  return Intl.NumberFormat('fr-FR', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

@Component({
  selector: 'app-admin-antenne',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full bg-zinc-950 flex flex-col relative overflow-hidden font-sans">
      
      <div class="flex-1 overflow-y-auto p-4 pb-96">
          <section class="mb-8">
              <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                  <div class="flex items-center gap-2 text-zinc-500">
                      <lucide-icon name="radio" class="w-4 h-4"></lucide-icon>
                      <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">{{t()('ANT_MONITOR')}}</h3>
                  </div>
                  <span class="text-[9px] font-bold text-zinc-600">{{campaigns().length}} {{t()('ANT_ACTIVE')}}</span>
              </div>

              <div class="space-y-4">
                  @if (campaigns().length === 0) {
                      <div class="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center flex flex-col items-center gap-2">
                          <lucide-icon name="mic-2" class="w-6 h-6 text-zinc-700"></lucide-icon>
                          <p class="text-[10px] text-zinc-600 uppercase tracking-widest">{{t()('ANT_EMPTY')}}</p>
                      </div>
                  }

                  @for (campaign of sortedCampaigns(); track campaign.id) {
                      <div 
                        class="relative p-4 rounded-xl border flex flex-col gap-2 transition-all duration-300"
                        [ngClass]="getCardStyle(campaign)"
                      >
                          <div class="flex justify-between items-start">
                              <div class="flex items-center gap-4 flex-1">
                                  <button 
                                    (click)="toggleCampaignStatus(campaign)" 
                                    class="hover:scale-110 transition-transform p-2 rounded-full"
                                    [ngClass]="campaign.schedule.isActive ? 'bg-white/10' : 'bg-black/20'"
                                  >
                                      @if (campaign.schedule.isActive) {
                                          <lucide-icon name="pause" class="w-4 h-4 fill-current"></lucide-icon>
                                      } @else {
                                          <lucide-icon name="play" class="w-4 h-4 fill-current"></lucide-icon>
                                      }
                                  </button>
                                  
                                  <div class="flex-1 min-w-0">
                                      <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                                          <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest" [ngClass]="campaign.priority >= 8 ? 'bg-white text-black' : 'bg-blue-500 text-white'">
                                              {{campaign.name}}
                                          </span>

                                          @if (campaign.type === 'ALERT') {
                                              <span class="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse" [ngClass]="campaign.priority >= 8 ? 'bg-white text-red-600 border-white' : 'bg-red-600 text-white border-red-500'">
                                                  <lucide-icon name="monitor" class="w-3 h-3"></lucide-icon> OVERLAY TV
                                              </span>
                                          }
                                          
                                          @if (campaign.targeting.locations.length > 0 || (campaign.targeting.interests && campaign.targeting.interests.length > 0)) {
                                              <div class="flex items-center gap-2 opacity-80">
                                                  @if (campaign.targeting.locations.length > 0) {
                                                      <span class="text-[9px] font-bold uppercase flex items-center gap-1 bg-white/20 px-1.5 rounded">
                                                          <lucide-icon name="map-pin" class="w-3 h-3"></lucide-icon>
                                                          {{campaign.targeting.locations.length}} ZONES
                                                      </span>
                                                  }
                                                  @if (campaign.targeting.interests && campaign.targeting.interests.length > 0) {
                                                      <span class="text-[9px] font-bold uppercase flex items-center gap-1 bg-white/20 px-1.5 rounded">
                                                          <lucide-icon name="pie-chart" class="w-3 h-3"></lucide-icon>
                                                          {{campaign.targeting.interests.length}} INTÉRÊTS
                                                      </span>
                                                  }
                                              </div>
                                          } @else {
                                              <span class="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                                                  <lucide-icon name="globe" class="w-3 h-3"></lucide-icon> {{t()('ANT_GLOBAL')}}
                                              </span>
                                          }
                                      </div>
                                      
                                      <p class="text-base font-bold leading-tight break-words">
                                          {{campaign.message}}
                                      </p>
                                  </div>
                              </div>
                              <div class="flex items-center gap-1">
                                  <button (click)="handleEdit(campaign)" class="opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all text-current"><lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon></button>
                                  <button (click)="deleteCampaign(campaign.id)" class="opacity-60 hover:opacity-100 p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all"><lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon></button>
                              </div>
                          </div>
                      </div>
                  }
              </div>
          </section>
          
          <section class="pt-6 border-t border-zinc-800">
              <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                  <div class="flex items-center gap-2 text-zinc-500">
                      <lucide-icon name="trophy" class="w-4 h-4"></lucide-icon>
                      <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">{{t()('ANT_CONFIG_RANK')}}</h3>
                  </div>
                  
                  <div class="flex bg-black p-0.5 rounded border border-zinc-800">
                      <button (click)="updateRankingMode('AUTO')" class="px-2 py-1 text-[8px] font-black uppercase rounded" [ngClass]="config().rankingMode === 'AUTO' ? 'bg-zinc-800 text-white' : 'text-zinc-600'">{{t()('ANT_MODE_AUTO')}}</button>
                      <button (click)="updateRankingMode('HYBRID')" class="px-2 py-1 text-[8px] font-black uppercase rounded" [ngClass]="config().rankingMode === 'HYBRID' ? 'bg-sky-600 text-white' : 'text-zinc-600'">{{t()('ANT_MODE_HYBRID')}}</button>
                      <button (click)="updateRankingMode('MANUAL')" class="px-2 py-1 text-[8px] font-black uppercase rounded" [ngClass]="config().rankingMode === 'MANUAL' ? 'bg-[#ffcc00] text-black' : 'text-zinc-600'">{{t()('ANT_MODE_MANUAL')}}</button>
                  </div>
              </div>

              <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-4 px-1">
                  @for (cat of ['TOUT', ...CATEGORIES]; track cat) {
                      <button
                          (click)="setRankingCategoryFilter(cat)"
                          class="flex-shrink-0 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all"
                          [ngClass]="rankingCategoryFilter === cat ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'"
                      >
                          {{cat === 'TOUT' ? 'TOUT' : t()('CAT_' + cat.toUpperCase(), cat)}}
                      </button>
                  }
              </div>

              @if (rankingCategoryFilter !== 'TOUT') {
                  <div class="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <div class="flex gap-2">
                          <input 
                              type="text" 
                              [(ngModel)]="categoryTitleEdit"
                              [placeholder]="'Ex: LES ROIS DE LA ' + rankingCategoryFilter"
                              class="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-white/50 uppercase"
                          />
                          <button 
                              (click)="handleUpdateCategoryTitle()"
                              class="px-4 bg-zinc-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-zinc-700"
                          >
                              {{t()('ANT_APPLY')}}
                          </button>
                      </div>
                  </div>
              }

              <div class="space-y-2 min-h-[100px]">
                  @if (filteredRankings().length === 0) {
                      <div class="p-6 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center opacity-50">
                          <lucide-icon name="filter" class="w-5 h-5 text-zinc-600 mb-2"></lucide-icon>
                          <p class="text-[9px] text-zinc-600 uppercase tracking-widest">
                              Aucun classement {{rankingCategoryFilter !== 'TOUT' ? 'en ' + rankingCategoryFilter : 'configuré'}}
                          </p>
                      </div>
                  } @else {
                      @for (entry of filteredRankings(); track entry.id; let idx = $index) {
                          <div class="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-xl hover:bg-zinc-800 transition-colors group">
                              <div class="flex items-center gap-4">
                                  <div class="flex flex-col items-center justify-center w-6">
                                      <span class="text-xs font-black" [ngClass]="idx < 3 ? 'text-[#ffcc00]' : 'text-zinc-600'">#{{idx + 1}}</span>
                                      @if (idx < 3) {
                                          <lucide-icon name="trophy" class="w-2 h-2 text-[#ffcc00] mt-0.5"></lucide-icon>
                                      }
                                  </div>
                                  
                                  <img [src]="entry.avatar" referrerpolicy="no-referrer" class="w-8 h-8 rounded-full border border-zinc-700 object-cover" alt="" />
                                  
                                  <div class="flex flex-col">
                                      <span class="text-xs font-bold text-white leading-none">{{entry.userName}}</span>
                                      <div class="flex items-center gap-2 mt-1">
                                          <span 
                                            class="text-[8px] font-black px-1.5 py-0.5 rounded text-black uppercase"
                                            [style.backgroundColor]="entry.color"
                                          >
                                              {{entry.categoryLabel}}
                                          </span>
                                          <span class="text-[9px] font-mono text-zinc-500">{{entry.score}} pts</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button (click)="moveRanking(entry.id, 'up')" class="p-1.5 hover:bg-white/10 rounded"><lucide-icon name="arrow-up" class="w-3 h-3 text-zinc-400"></lucide-icon></button>
                                  <button (click)="moveRanking(entry.id, 'down')" class="p-1.5 hover:bg-white/10 rounded"><lucide-icon name="arrow-down" class="w-3 h-3 text-zinc-400"></lucide-icon></button>
                                  <button (click)="removeManualRanking(entry.id)" class="p-1.5 hover:bg-red-500/20 rounded text-zinc-600 hover:text-red-500"><lucide-icon name="trash-2" class="w-3 h-3"></lucide-icon></button>
                              </div>
                          </div>
                      }
                  }
                  
                  @if (config().manualRankings.length > 0 && rankingCategoryFilter === 'TOUT') {
                      <div class="flex justify-center pt-2">
                          <button 
                              (click)="handleClearRankings()"
                              class="text-[9px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 uppercase tracking-widest"
                          >
                              <lucide-icon name="refresh-cw" class="w-3 h-3"></lucide-icon> RàZ Liste
                          </button>
                      </div>
                  }
              </div>
          </section>
      </div>

      <div class="absolute bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
          <div class="flex">
              <button (click)="consoleMode = 'MESSAGE'" class="flex-1 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-t-2 transition-colors" [ngClass]="consoleMode === 'MESSAGE' ? 'border-white bg-zinc-900 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400 bg-black'">
                  <lucide-icon name="message-square" class="w-3 h-3"></lucide-icon> {{editingId ? 'MODIFICATION' : t()('ANT_BTN_MSG')}}
              </button>
              <button (click)="consoleMode = 'RANKING'" class="flex-1 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-t-2 transition-colors" [ngClass]="consoleMode === 'RANKING' ? 'border-[#ffcc00] bg-zinc-900 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400 bg-black'">
                  <lucide-icon name="trophy" class="w-3 h-3"></lucide-icon> {{t()('ANT_BTN_RANK')}}
              </button>
          </div>

          <div class="p-4 bg-zinc-900 pb-8 max-h-[60vh] overflow-y-auto">
              @if (consoleMode === 'MESSAGE') {
                  <div class="space-y-4">
                      
                      <div>
                          <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                              <div class="flex items-center gap-2 text-zinc-500">
                                  <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon>
                                  <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">{{t()('ANT_CONTENT_EDIT')}}</h3>
                              </div>
                          </div>
                          <div class="flex flex-col gap-2">
                              <div class="relative">
                                  <input 
                                      type="text"
                                      [(ngModel)]="msgForm.category"
                                      placeholder="TITRE / CATÉGORIE (Ex: CHOC, SANTÉ...)"
                                      class="w-full rounded-lg px-4 py-2 text-xs font-black uppercase outline-none transition-all"
                                      [ngClass]="msgForm.isUrgent ? 'bg-red-900/50 text-white border-red-500 border placeholder:text-red-300' : 'bg-black border border-zinc-700 text-white placeholder:text-zinc-600'"
                                  />
                                  <lucide-icon name="tag" class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500"></lucide-icon>
                              </div>

                              <div class="flex gap-2 items-stretch h-20">
                                  <textarea 
                                      [(ngModel)]="msgForm.text"
                                      [placeholder]="msgForm.withOverlay ? 'CONTENU DE L’ALERTE FLASH...' : 'Contenu de l’information défilante...'"
                                      class="flex-1 rounded-xl p-3 text-sm font-bold uppercase outline-none resize-none transition-all duration-300"
                                      [ngClass]="getInputStyle()"
                                  ></textarea>
                                  <div class="flex flex-col gap-2 w-24">
                                      <button 
                                          (click)="msgForm.withOverlay = !msgForm.withOverlay"
                                          class="flex-1 px-2 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all duration-200"
                                          [ngClass]="msgForm.withOverlay ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-600'"
                                      >
                                          <lucide-icon name="monitor" class="w-4 h-4"></lucide-icon>
                                          <span class="text-[7px] font-black uppercase tracking-tighter">{{t()('ANT_MODE_TV')}}</span>
                                      </button>
                                      <button 
                                          (click)="msgForm.isUrgent = !msgForm.isUrgent"
                                          class="flex-1 px-2 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all duration-200"
                                          [ngClass]="msgForm.isUrgent && !msgForm.withOverlay ? 'bg-red-600 text-white border-red-600' : 'bg-black border-zinc-800 text-zinc-600'"
                                          [disabled]="msgForm.withOverlay"
                                      >
                                          <lucide-icon name="zap" class="w-4 h-4"></lucide-icon>
                                          <span class="text-[7px] font-black uppercase tracking-tighter">{{t()('ANT_URGENT')}}</span>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div class="bg-black border border-zinc-800 rounded-xl p-3 space-y-3">
                          <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                              <div class="flex items-center gap-2 text-zinc-500">
                                  <lucide-icon name="target" class="w-4 h-4"></lucide-icon>
                                  <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">{{t()('ANT_TARGET_AUDIENCE')}}</h3>
                              </div>
                              <span class="text-[8px] font-mono text-zinc-600">
                                  {{(msgForm.location.length === 0 && msgForm.interests.length === 0) ? t()('ANT_GLOBAL') : t()('ANT_TARGETED')}}
                              </span>
                          </div>

                          <div class="space-y-2">
                              <div class="flex gap-2">
                                  <div class="relative flex-1">
                                      <input 
                                          type="text" 
                                          [(ngModel)]="locInput"
                                          (keydown.enter)="addLocation(locInput)"
                                          placeholder="Ajouter une zone (Ville, Quartier...)"
                                          class="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 pl-8 text-xs text-white rounded-lg outline-none focus:border-white/20"
                                      />
                                      <lucide-icon name="map-pin" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500"></lucide-icon>
                                  </div>
                                  <button (click)="addLocation(locInput)" class="px-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">
                                      <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                                  </button>
                              </div>
                              <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                  @for (loc of availableLocations().slice(0, 5); track loc) {
                                      <button (click)="addLocation(loc)" class="whitespace-nowrap px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 hover:text-white uppercase font-bold">
                                          {{loc}}
                                      </button>
                                  }
                              </div>
                              <div class="flex flex-wrap gap-2">
                                  @for (loc of msgForm.location; track loc) {
                                      <span class="flex items-center gap-1 px-2 py-1 bg-sky-900/30 border border-sky-500/30 text-sky-400 rounded-md text-[10px] font-bold uppercase">
                                          {{loc}}
                                          <button (click)="removeLocation(loc)"><lucide-icon name="x" class="w-3 h-3 hover:text-white"></lucide-icon></button>
                                      </span>
                                  }
                              </div>
                          </div>

                          <div class="h-[1px] bg-zinc-800 w-full my-2"></div>

                          <div>
                              <span class="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Cibler aussi par intérêt (Même hors zone)</span>
                              <div class="flex flex-wrap gap-2">
                                  @for (cat of CATEGORIES; track cat) {
                                      <button
                                          (click)="toggleInterest(cat)"
                                          class="px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all"
                                          [ngClass]="msgForm.interests.includes(cat) ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'"
                                      >
                                          {{t()('CAT_' + cat.toUpperCase(), cat)}}
                                      </button>
                                  }
                              </div>
                          </div>
                      </div>

                      <div class="flex gap-2 pt-2">
                          @if (editingId) {
                              <button (click)="handleCancelEdit()" class="px-4 bg-zinc-800 text-zinc-400 rounded-xl font-black uppercase text-xs hover:text-white hover:bg-zinc-700">
                                  <lucide-icon name="rotate-ccw" class="w-4 h-4"></lucide-icon>
                              </button>
                          }
                          <button 
                              (click)="handlePublishMessage()"
                              [disabled]="!msgForm.text"
                              class="flex-1 py-4 font-black uppercase text-xs tracking-widest rounded-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-xl flex items-center justify-center gap-2"
                              [ngClass]="msgForm.isUrgent ? 'bg-red-600 text-white' : (msgForm.withOverlay ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700')"
                          >
                              @if (editingId) {
                                <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon> {{t()('ANT_UPDATE')}}
                              } @else {
                                {{msgForm.isUrgent ? t()('ANT_SEND') : (msgForm.withOverlay ? 'LANCER INTERRUPTION ANTENNE' : 'AJOUTER AU CLASSEMENT')}}
                              }
                          </button>
                      </div>
                  </div>
              }
              
              @if (consoleMode === 'RANKING') {
                  <div class="space-y-4">
                      <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                          <div class="flex items-center gap-2 text-zinc-500">
                              <lucide-icon name="sliders" class="w-4 h-4"></lucide-icon>
                              <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">CONFIGURATION DU PROFIL</h3>
                          </div>
                      </div>
                      
                      <div class="relative">
                          <input type="text" [(ngModel)]="rankingUserSearch" placeholder="Rechercher utilisateur..." class="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-4 pr-4 text-white text-xs font-bold outline-none" />
                          @if (rankingUserSearch && availableUsers().length > 0 && !rankingForm.userId) {
                              <div class="absolute bottom-full left-0 right-0 bg-zinc-900 border border-zinc-700 mb-1 rounded-xl max-h-32 overflow-y-auto z-10 shadow-xl">
                                  @for (u of availableUsers(); track u.uid) {
                                      <button (click)="rankingForm.userId = u.uid; rankingUserSearch = u.displayName" class="w-full text-left p-3 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800 last:border-0">
                                          <img [src]="u.photoURL || u.avatarUrl || ''" referrerpolicy="no-referrer" class="w-6 h-6 rounded-full" alt="" />
                                          <span class="text-xs text-white font-bold">{{u.displayName}}</span>
                                      </button>
                                  }
                              </div>
                          }
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                          <input type="number" min="0" [(ngModel)]="rankingForm.score" placeholder="Score" class="bg-black border border-zinc-700 rounded-xl p-3 text-white text-xs font-bold outline-none" />
                          <input type="text" [(ngModel)]="rankingForm.categoryLabel" placeholder="Label (ex: TECH)" class="bg-black border border-zinc-700 rounded-xl p-3 text-white text-xs font-bold outline-none uppercase" />
                      </div>
                      <button (click)="handleAddRanking()" [disabled]="!rankingForm.userId || !rankingForm.score" class="w-full py-4 bg-[#ffcc00] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white active:scale-95 transition-all disabled:opacity-50 mt-2">ÉPINGLER AU SOMMET</button>
                  </div>
              }
          </div>
      </div>
    </div>
  `
})
export class AdminAntenneComponent implements OnInit {
  @Input() articles: Article[] = [];
  @Input() users: UserProfile[] = [];

  private broadcast = inject(BroadcastService);
  private translation = inject(TranslationService);
  t = this.translation.t;

  CATEGORIES = CATEGORIES;
  campaigns = this.broadcast.campaigns;
  config = this.broadcast.config;

  consoleMode: ConsoleMode = 'MESSAGE';
  editingId: string | null = null;
  
  rankingCategoryFilter = 'TOUT';
  rankingUserSearch = '';
  categoryTitleEdit = '';

  rankingForm = {
      score: '',
      categoryLabel: '',
      color: '#ffcc00',
      userId: ''
  };

  msgForm = {
      category: '',
      text: '',
      isUrgent: false,
      withOverlay: false,
      location: [] as string[],
      interests: [] as Category[],
      linkedArticleId: ''
  };

  locInput = '';

  ngOnInit() {
    this.updateCategoryTitleEdit();
  }

  updateCategoryTitleEdit() {
    if (this.rankingCategoryFilter !== 'TOUT') {
        this.rankingForm.categoryLabel = this.rankingCategoryFilter;
        const existingTitle = this.config().categoryTitles?.[this.rankingCategoryFilter] || '';
        this.categoryTitleEdit = existingTitle;
    }
  }

  setRankingCategoryFilter(cat: string) {
    this.rankingCategoryFilter = cat;
    this.updateCategoryTitleEdit();
  }

  availableUsers = computed<UserProfile[]>(() => {
      if (!this.rankingUserSearch) return [];
      const needle = this.rankingUserSearch.toLowerCase();
      return this.users.filter(u => (u.displayName ?? '').toLowerCase().includes(needle));
  });

  // Location is not yet tracked on UserProfile — admins type the
  // location free-form. Suggestions are intentionally empty.
  availableLocations = computed<string[]>(() => []);

  filteredRankings = computed(() => {
      if (this.rankingCategoryFilter === 'TOUT') return this.config().manualRankings;
      return this.config().manualRankings.filter((entry: any) => 
          entry.categoryLabel.toUpperCase() === this.rankingCategoryFilter.toUpperCase()
      );
  });

  sortedCampaigns = computed(() => {
    return [...this.campaigns()].sort((a, b) => b.priority - a.priority);
  });

  handleEdit(c: BroadcastCampaign) {
      this.msgForm = {
          category: c.name,
          text: c.message,
          isUrgent: c.priority === 8,
          withOverlay: c.type === 'ALERT',
          location: c.targeting.locations,
          interests: c.targeting.interests || [],
          linkedArticleId: c.linkedArticleId || ''
      };
      this.editingId = c.id;
      this.consoleMode = 'MESSAGE';
  }

  handleCancelEdit() {
      this.msgForm = { category: '', text: '', isUrgent: false, withOverlay: false, location: [], interests: [], linkedArticleId: '' };
      this.editingId = null;
  }

  handlePublishMessage() {
      if (!this.msgForm.text) return;

      const type: BroadcastType = this.msgForm.withOverlay ? 'ALERT' : 'INFO';
      const priority = this.msgForm.withOverlay ? 10 : (this.msgForm.isUrgent ? 8 : 5);
      
      if (this.editingId) {
          const existing = this.campaigns().find((c: any) => c.id === this.editingId);
          if (existing) {
              const updated: BroadcastCampaign = {
                  ...existing,
                  name: this.msgForm.category ? this.msgForm.category.toUpperCase() : 'INFO',
                  message: this.msgForm.text,
                  type: type,
                  priority: priority,
                  targeting: { 
                      ...existing.targeting, 
                      locations: this.msgForm.location,
                      interests: this.msgForm.interests
                  },
                  linkedArticleId: this.msgForm.linkedArticleId || undefined
              };
              this.broadcast.updateCampaign(updated);
          }
      } else {
          const newCampaign: BroadcastCampaign = {
              id: Date.now().toString(),
              name: this.msgForm.category ? this.msgForm.category.toUpperCase() : 'INFO', 
              message: this.msgForm.text,
              type: type,
              priority: priority,
              capping: { maxViews: 0, resetPeriod: 'never' },
              targeting: { 
                  locations: this.msgForm.location,
                  interests: this.msgForm.interests
              },
              schedule: { startDate: new Date().toISOString(), isActive: true },
              createdAt: new Date().toISOString(),
              linkedArticleId: this.msgForm.linkedArticleId || undefined
          };
          this.broadcast.addCampaign(newCampaign);
      }

      this.handleCancelEdit(); 
  }

  handleAddRanking() {
      const user = this.users.find(u => u.uid === this.rankingForm.userId);
      if (!user || !this.rankingForm.score || !this.rankingForm.categoryLabel) return;
      const numericScore = parseFloat(this.rankingForm.score);
      const entry: ManualRankingEntry = {
          id: Date.now().toString(),
          userName: user.displayName,
          avatar: user.photoURL ?? user.avatarUrl ?? '',
          score: formatCompactNumber(numericScore),
          rawValue: numericScore,
          categoryLabel: this.rankingForm.categoryLabel.toUpperCase(),
          color: this.rankingForm.color
      };
      this.broadcast.addManualRanking(entry);
      this.rankingForm = { 
          ...this.rankingForm, 
          score: '', 
          userId: '',
          categoryLabel: this.rankingCategoryFilter !== 'TOUT' ? this.rankingCategoryFilter : ''
      };
      this.rankingUserSearch = '';
  }

  handleUpdateCategoryTitle() {
      if (this.rankingCategoryFilter === 'TOUT') return;
      const newTitles = { ...this.config().categoryTitles, [this.rankingCategoryFilter]: this.categoryTitleEdit };
      this.broadcast.updateConfig({ ...this.config(), categoryTitles: newTitles });
  }

  handleClearRankings() {
      this.broadcast.updateConfig({ ...this.config(), manualRankings: [] });
  }

  toggleCampaignStatus(campaign: BroadcastCampaign) {
      this.broadcast.updateCampaign({
          ...campaign,
          schedule: { ...campaign.schedule, isActive: !campaign.schedule.isActive }
      });
  }

  addLocation(loc: string) {
      if (!loc) return;
      const cleanLoc = loc.trim();
      if (!this.msgForm.location.includes(cleanLoc)) {
          this.msgForm.location.push(cleanLoc);
      }
      this.locInput = '';
  }

  removeLocation(loc: string) {
      this.msgForm.location = this.msgForm.location.filter((l: any) => l !== loc);
  }

  toggleInterest(cat: Category) {
      const exists = this.msgForm.interests.includes(cat);
      if (exists) {
        this.msgForm.interests = this.msgForm.interests.filter((c: any) => c !== cat);
      } else {
        this.msgForm.interests.push(cat);
      }
  }
  
  getCardStyle(c: BroadcastCampaign) {
      if (c.id === this.editingId) return 'bg-zinc-800 border-yellow-500 ring-1 ring-yellow-500 shadow-xl scale-[1.02] z-10';
      if (!c.schedule.isActive) return 'bg-zinc-900 border-zinc-800 opacity-50 grayscale';
      if (c.priority >= 8) return 'bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white';
      if (c.type === 'ALERT') return 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] text-black';
      return 'bg-zinc-900 border-zinc-700 text-zinc-300';
  }

  getInputStyle() {
      if (this.msgForm.isUrgent) return 'bg-red-600 text-white border-red-500 placeholder:text-white/60';
      if (this.msgForm.withOverlay) return 'bg-white text-black border-white placeholder:text-black/40';
      return 'bg-black text-white border-zinc-700 placeholder:text-zinc-600';
  }

  updateRankingMode(mode: 'AUTO' | 'HYBRID' | 'MANUAL') {
    this.broadcast.updateConfig({ ...this.config(), rankingMode: mode });
  }

  deleteCampaign(id: string) {
    this.broadcast.deleteCampaign(id);
  }

  moveRanking(id: string, direction: 'up' | 'down') {
    this.broadcast.moveRanking(id, direction);
  }

  removeManualRanking(id: string) {
    this.broadcast.removeManualRanking(id);
  }

  handleBack(): boolean {
    if (this.consoleMode !== 'MESSAGE') {
        this.consoleMode = 'MESSAGE';
        return true;
    }
    if (this.editingId) {
        this.handleCancelEdit();
        return true;
    }
    return false;
  }
}
