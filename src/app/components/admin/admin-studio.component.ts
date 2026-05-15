import { Component, signal, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../../services/translation.service';
import { BroadcastService } from '../../services/broadcast.service';
import { Logger } from '../../services/logger.service';
import { Article, Category, ExternalVoice, BroadcastCampaign } from '../../types';
import { CATEGORIES } from '../../constants';

type StudioSubTab = 'EDITEUR' | 'PROGRAMME' | 'BROUILLONS' | 'ARCHIVES';

@Component({
  selector: 'app-admin-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-950 relative">
        <div class="flex bg-black border-b border-zinc-800 shrink-0">
          <button (click)="activeSubTab.set('EDITEUR')" [class]="getSubTabClass('EDITEUR')">
            <lucide-icon name="plus-square" class="w-3 h-3"></lucide-icon> Nouveau
          </button>
          <button (click)="activeSubTab.set('PROGRAMME')" [class]="getSubTabClass('PROGRAMME')">
            <lucide-icon name="clock" class="w-3 h-3"></lucide-icon> Programmé
          </button>
          <button (click)="activeSubTab.set('BROUILLONS')" [class]="getSubTabClass('BROUILLONS')">
            <lucide-icon name="file-edit" class="w-3 h-3"></lucide-icon> Brouillons
          </button>
          <button (click)="activeSubTab.set('ARCHIVES')" [class]="getSubTabClass('ARCHIVES')">
            <lucide-icon name="archive" class="w-3 h-3"></lucide-icon> Archives
          </button>
        </div>

        <div class="flex-1 overflow-y-auto pb-32">
            
            @if (activeSubTab() === 'EDITEUR') {
                <div>
                    <div class="p-4 space-y-6 bg-zinc-950">
                        <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div class="flex items-center gap-2 text-zinc-500">
                                <lucide-icon name="align-left" class="w-4 h-4"></lucide-icon>
                                <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">CONTENU PRINCIPAL</h3>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div>
                                <input 
                                    type="text"
                                    [(ngModel)]="formData().title"
                                    placeholder="Titre de l'article..."
                                    class="w-full bg-black border border-zinc-800 p-4 text-white font-bold text-xl outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700"
                                />
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <select 
                                    [(ngModel)]="formData().category"
                                    class="w-full bg-black border border-zinc-800 p-3 text-white text-xs font-mono outline-none rounded-none h-14 uppercase"
                                >
                                    @for (cat of categories; track cat) {
                                        <option [value]="cat">{{ cat }}</option>
                                    }
                                </select>
                                <button 
                                    (click)="toggleExclusive()"
                                    class="w-full h-14 flex items-center justify-center border text-xs font-black uppercase tracking-widest"
                                    [ngClass]="formData().isExclusive ? 'bg-red-600 text-white border-red-600' : 'bg-black text-zinc-500 border-zinc-800'"
                                >
                                    {{ formData().isExclusive ? 'EXCLUSIVE' : 'STANDARD' }}
                                </button>
                            </div>

                            <div class="relative">
                                <input 
                                    type="text" 
                                    [(ngModel)]="formData().author"
                                    placeholder="Signature..."
                                    class="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                />
                                <lucide-icon name="pen-tool" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"></lucide-icon>
                            </div>

                            <div>
                                <div class="flex bg-black border border-zinc-800 p-1 mb-2">
                                    <button 
                                        (click)="coverType.set('image')"
                                        class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        [ngClass]="coverType() === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-white'"
                                    >
                                        <lucide-icon name="image" class="w-3 h-3"></lucide-icon> Image
                                    </button>
                                    <button 
                                        (click)="coverType.set('video')"
                                        class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        [ngClass]="coverType() === 'video' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-white'"
                                    >
                                        <lucide-icon name="play-square" class="w-3 h-3"></lucide-icon> Vidéo (MP4)
                                    </button>
                                </div>

                                <div class="relative">
                                    @if (coverType() === 'image') {
                                        <input 
                                            type="text" 
                                            [(ngModel)]="formData().imageUrl"
                                            placeholder="URL IMAGE (Format 1:1)..."
                                            class="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                        />
                                        <lucide-icon name="image" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"></lucide-icon>
                                    } @else {
                                        <input 
                                            type="text" 
                                            [(ngModel)]="formData().videoUrl"
                                            placeholder="URL VIDÉO MP4 (Format 1:1)..."
                                            class="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                        />
                                        <lucide-icon name="play-square" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"></lucide-icon>
                                    }
                                </div>
                            </div>

                            <textarea 
                                [(ngModel)]="formData().summary"
                                class="w-full bg-black border border-zinc-800 p-4 text-white text-sm font-medium outline-none focus:border-white min-h-[100px] rounded-none placeholder:text-zinc-700"
                                placeholder="Résumé de l'article..."
                            ></textarea>

                            <textarea 
                                [(ngModel)]="formData().content"
                                class="w-full bg-black border border-zinc-800 p-4 text-zinc-300 text-sm leading-relaxed outline-none focus:border-white min-h-[250px] font-mono rounded-none placeholder:text-zinc-700"
                                placeholder="Contenu de l'article..."
                            ></textarea>
                        </div>
                    </div>

                    <div class="h-4 bg-zinc-900 border-y border-zinc-800 flex items-center justify-center">
                        <div class="h-[1px] w-full bg-zinc-800"></div>
                    </div>

                    <div class="p-4 bg-zinc-950">
                        <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div class="flex items-center gap-2 text-zinc-500">
                                <lucide-icon name="target" class="w-4 h-4"></lucide-icon>
                                <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">Ciblage</h3>
                            </div>
                            <span class="text-[8px] font-mono text-zinc-600">
                                {{ targetingLocations().length === 0 && targetingInterests().length === 0 ? 'Global' : 'Ciblé' }}
                            </span>
                        </div>

                        <div class="space-y-4">
                            <div class="space-y-2">
                                <div class="flex gap-2">
                                    <div class="relative flex-1">
                                        <input 
                                            type="text" 
                                            [(ngModel)]="locInput"
                                            (keydown.enter)="addLocation()"
                                            placeholder="Ajouter une zone (Ville, Quartier...)"
                                            class="w-full bg-black border border-zinc-800 px-3 py-3 pl-10 text-xs text-white outline-none focus:border-white/20"
                                        />
                                        <lucide-icon name="map-pin" class="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500"></lucide-icon>
                                    </div>
                                    <button (click)="addLocation()" class="px-4 bg-zinc-800 text-white hover:bg-zinc-700">
                                        <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                                    </button>
                                </div>
                                <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                    @for (loc of availableLocations.slice(0, 5); track loc) {
                                        <button (click)="addLocationFromList(loc)" class="whitespace-nowrap px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 hover:text-white uppercase font-bold">
                                            {{ loc }}
                                        </button>
                                    }
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    @for (loc of targetingLocations(); track loc) {
                                        <span class="flex items-center gap-1 px-2 py-1 bg-sky-900/30 border border-sky-500/30 text-sky-400 rounded-md text-[10px] font-bold uppercase">
                                            {{ loc }}
                                            <button (click)="removeLocation(loc)"><lucide-icon name="x" class="w-3 h-3 hover:text-white"></lucide-icon></button>
                                        </span>
                                    }
                                </div>
                            </div>

                            <div>
                                <span class="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2 flex items-center gap-1">
                                    <lucide-icon name="pie-chart" class="w-3 h-3"></lucide-icon> Intérêts (Optionnel)
                                </span>
                                <div class="flex flex-wrap gap-2">
                                    @for (cat of categories; track cat) {
                                        <button
                                            (click)="toggleInterest(cat)"
                                            class="px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all"
                                            [ngClass]="targetingInterests().includes(cat) ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'"
                                        >
                                            {{ cat }}
                                        </button>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="h-4 bg-zinc-900 border-y border-zinc-800 flex items-center justify-center">
                        <div class="h-[1px] w-full bg-zinc-800"></div>
                    </div>

                    <div class="p-4 bg-zinc-925">
                       <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div class="flex items-center gap-2 text-zinc-500">
                                <lucide-icon name="globe" class="w-4 h-4"></lucide-icon>
                                <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">RÉSEAU D'ÉCHOS</h3>
                            </div>
                            <span class="text-[9px] font-bold bg-zinc-800 px-2 py-1 rounded text-white">{{ formData().voices.length }} Actifs</span>
                       </div>
                       
                        @if (formData().voices.length > 0) {
                            <div class="space-y-3 mb-8">
                                @for (voice of formData().voices; track voice.id; let idx = $index) {
                                    <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-start gap-4">
                                        <div class="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded text-xs font-mono text-zinc-500 shrink-0">{{ idx + 1 }}</div>
                                        <div class="flex-1 min-w-0">
                                            <span class="text-xs font-bold text-white truncate block">{{ voice.author }}</span>
                                            <p class="text-xs text-zinc-400 line-clamp-1">{{ voice.content }}</p>
                                        </div>
                                        <button (click)="handleRemoveVoice(voice.id)" class="text-zinc-600 hover:text-red-500"><lucide-icon name="x" class="w-4 h-4"></lucide-icon></button>
                                    </div>
                                }
                            </div>
                        }
                        
                        <div class="bg-zinc-900 border-2 border-dashed border-zinc-800 p-5 rounded-2xl relative">
                            <span class="absolute -top-3 left-4 bg-zinc-900 px-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Créer un nouvel écho</span>
                            <div class="grid grid-cols-4 gap-2 mb-4">
                                <button (click)="echoForm().type = 'tweet'" class="flex flex-col items-center justify-center py-3 rounded-lg border transition-all active:scale-95" [ngClass]="echoForm().type === 'tweet' ? 'bg-zinc-800 border-white/20' : 'bg-black border-transparent'">
                                    <lucide-icon name="twitter" class="w-5 h-5 mb-1" [ngClass]="echoForm().type === 'tweet' ? 'text-white' : 'text-zinc-600'"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase text-zinc-500">tweet</span>
                                </button>
                                <button (click)="echoForm().type = 'video'" class="flex flex-col items-center justify-center py-3 rounded-lg border transition-all active:scale-95" [ngClass]="echoForm().type === 'video' ? 'bg-zinc-800 border-white/20' : 'bg-black border-transparent'">
                                    <lucide-icon name="video" class="w-5 h-5 mb-1" [ngClass]="echoForm().type === 'video' ? 'text-white' : 'text-zinc-600'"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase text-zinc-500">video</span>
                                </button>
                                <button (click)="echoForm().type = 'audio'" class="flex flex-col items-center justify-center py-3 rounded-lg border transition-all active:scale-95" [ngClass]="echoForm().type === 'audio' ? 'bg-zinc-800 border-white/20' : 'bg-black border-transparent'">
                                    <lucide-icon name="mic" class="w-5 h-5 mb-1" [ngClass]="echoForm().type === 'audio' ? 'text-white' : 'text-zinc-600'"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase text-zinc-500">audio</span>
                                </button>
                                <button (click)="echoForm().type = 'text'" class="flex flex-col items-center justify-center py-3 rounded-lg border transition-all active:scale-95" [ngClass]="echoForm().type === 'text' ? 'bg-zinc-800 border-white/20' : 'bg-black border-transparent'">
                                    <lucide-icon name="message-circle" class="w-5 h-5 mb-1" [ngClass]="echoForm().type === 'text' ? 'text-white' : 'text-zinc-600'"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase text-zinc-500">text</span>
                                </button>
                            </div>
                            <div class="space-y-3 mb-4">
                                <input type="text" [(ngModel)]="echoForm().author" placeholder="Auteur..." class="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg" />
                                <input type="text" [(ngModel)]="echoForm().title" placeholder="Titre..." class="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg" />
                                <textarea [(ngModel)]="echoForm().content" placeholder="Contenu..." class="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg min-h-[80px]"></textarea>
                            </div>
                            <button (click)="handleAddVoice()" [disabled]="!echoForm().author || !echoForm().content" class="w-full py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-zinc-200 disabled:opacity-50">Ajouter</button>
                        </div>
                    </div>

                    <div class="p-4 mt-4 bg-zinc-950 border-t border-zinc-800">
                        <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div class="flex items-center gap-2 text-zinc-500">
                                <lucide-icon name="radio" class="w-4 h-4"></lucide-icon>
                                <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">PROPULSION ANTENNE</h3>
                            </div>
                            <button 
                                (click)="broadcastConfig().active = !broadcastConfig().active"
                                class="w-10 h-6 rounded-full p-1 transition-colors"
                                [ngClass]="broadcastConfig().active ? 'bg-sky-500' : 'bg-zinc-800'"
                            >
                                <div class="w-4 h-4 bg-white rounded-full transition-transform" [ngClass]="broadcastConfig().active ? 'translate-x-4' : ''"></div>
                            </button>
                        </div>

                        @if (broadcastConfig().active) {
                            <div class="grid grid-cols-3 gap-2">
                                <button 
                                    (click)="broadcastConfig().mode = 'STANDARD'"
                                    class="p-3 rounded-xl border flex flex-col items-center gap-2"
                                    [ngClass]="broadcastConfig().mode === 'STANDARD' ? 'bg-sky-900/20 border-sky-500 text-sky-500' : 'bg-black border-zinc-800 text-zinc-500'"
                                >
                                    <lucide-icon name="radio" class="w-4 h-4"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase">Standard</span>
                                </button>
                                <button 
                                    (click)="broadcastConfig().mode = 'URGENT'"
                                    class="p-3 rounded-xl border flex flex-col items-center gap-2"
                                    [ngClass]="broadcastConfig().mode === 'URGENT' ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-black border-zinc-800 text-zinc-500'"
                                >
                                    <lucide-icon name="zap" class="w-4 h-4"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase">Urgent</span>
                                </button>
                                <button 
                                    (click)="broadcastConfig().mode = 'FLASH'"
                                    class="p-3 rounded-xl border flex flex-col items-center gap-2"
                                    [ngClass]="broadcastConfig().mode === 'FLASH' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black border-zinc-800 text-zinc-500'"
                                >
                                    <lucide-icon name="alert-triangle" class="w-4 h-4"></lucide-icon>
                                    <span class="text-[8px] font-black uppercase">Flash TV</span>
                                </button>
                            </div>
                        }
                        <p class="text-[9px] text-zinc-600 mt-2 italic px-1">
                            * Activez ceci pour envoyer directement le titre du dossier dans le bandeau défilant ou l'overlay.
                        </p>
                    </div>

                    <div class="p-4 mt-4 bg-zinc-950 border-t border-zinc-800 pb-8">
                         <div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div class="flex items-center gap-2 text-zinc-500">
                                <lucide-icon name="clock" class="w-4 h-4"></lucide-icon>
                                <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">TIMING PUBLICATION</h3>
                            </div>
                            <div class="flex bg-black p-1 border border-zinc-800 rounded-lg">
                                <button 
                                    (click)="isScheduled.set(false)"
                                    class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded"
                                    [ngClass]="!isScheduled() ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'"
                                >
                                    Immédiat
                                </button>
                                <button 
                                    (click)="isScheduled.set(true)"
                                    class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded"
                                    [ngClass]="isScheduled() ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'"
                                >
                                    Programmer
                                </button>
                            </div>
                         </div>

                        @if (isScheduled()) {
                            <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                <div class="relative">
                                    <input 
                                        type="datetime-local"
                                        [(ngModel)]="scheduledDate"
                                        class="w-full bg-black border border-zinc-700 p-4 text-white font-mono text-sm outline-none focus:border-white rounded-lg appearance-none h-14"
                                        style="color-scheme: dark;" 
                                    />
                                    <lucide-icon name="calendar" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"></lucide-icon>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }

            @if (activeSubTab() !== 'EDITEUR') {
                <div class="p-4 text-center text-zinc-600 pt-20">
                    <lucide-icon name="archive" class="w-12 h-12 mx-auto mb-4 opacity-20"></lucide-icon>
                    <p class="text-xs font-mono uppercase">Module d'historique (Mock)</p>
                </div>
            }
        </div>

        @if (activeSubTab() === 'EDITEUR') {
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 z-20 flex gap-2">
                <button 
                    (click)="handlePreview()"
                    class="flex-1 py-4 bg-zinc-800 text-white font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-700"
                >
                    <lucide-icon name="eye" class="w-4 h-4"></lucide-icon> APERÇU
                </button>
                <button 
                    (click)="handlePublish()"
                    [disabled]="isSubmitting() || !formData().title || (isScheduled() && !scheduledDate())"
                    class="flex-[2] py-4 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2"
                    [ngClass]="isSubmitting() || !formData().title || (isScheduled() && !scheduledDate()) ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' : 'bg-white text-black hover:bg-zinc-200'"
                >
                    @if (isSubmitting()) {
                        TRAITEMENT...
                    } @else {
                        @if (isScheduled()) {
                            <lucide-icon name="clock" class="w-4 h-4"></lucide-icon> PROGRAMMER
                        } @else {
                            <lucide-icon name="save" class="w-4 h-4"></lucide-icon> PUBLIER
                        }
                    }
                </button>
            </div>
        }
    </div>
  `
})
export class AdminStudioComponent {
  translationService = inject(TranslationService);
  broadcastService = inject(BroadcastService);
  private logger = inject(Logger);

  publish = output<Article>();
  preview = output<Article>();

  activeSubTab = signal<StudioSubTab>('EDITEUR');
  isSubmitting = signal(false);
  isScheduled = signal(false);
  scheduledDate = signal('');

  broadcastConfig = signal<{ active: boolean; mode: 'STANDARD' | 'URGENT' | 'FLASH' }>({ active: false, mode: 'STANDARD' });
  
  targetingLocations = signal<string[]>([]);
  targetingInterests = signal<Category[]>([]);
  locInput = signal('');

  echoForm = signal({
    title: '', 
    author: '',
    source: '',
    content: '',
    type: 'tweet' as 'tweet' | 'video' | 'audio' | 'text',
    avatar: 'https://i.pravatar.cc/150'
  });

  coverType = signal<'image' | 'video'>('image');

  formData = signal({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    category: 'Tech' as Category,
    isExclusive: false,
    author: 'CakeNews', 
    voices: [] as ExternalVoice[]
  });

  categories = CATEGORIES;
  availableLocations = ['Paris', 'Libreville', 'Dakar', 'Abidjan', 'Montreal'];

  getSubTabClass(id: StudioSubTab) {
    return `flex-1 py-3 flex items-center justify-center gap-2 border-b-2 text-[9px] font-black uppercase tracking-widest transition-colors ${
      this.activeSubTab() === id
        ? 'border-white text-white'
        : 'border-transparent text-zinc-600 hover:text-zinc-400'
    }`;
  }

  handleBack(): boolean {
    if (this.activeSubTab() !== 'EDITEUR') {
      this.activeSubTab.set('EDITEUR');
      return true;
    }
    return false;
  }

  toggleExclusive() {
    this.formData.update(prev => ({ ...prev, isExclusive: !prev.isExclusive }));
  }

  addLocation() {
    const loc = this.locInput().trim();
    if (loc && !this.targetingLocations().includes(loc)) {
      this.targetingLocations.update(prev => [...prev, loc]);
    }
    this.locInput.set('');
  }

  addLocationFromList(loc: string) {
    if (!this.targetingLocations().includes(loc)) {
      this.targetingLocations.update(prev => [...prev, loc]);
    }
  }

  removeLocation(loc: string) {
    this.targetingLocations.update(prev => prev.filter(l => l !== loc));
  }

  toggleInterest(cat: Category) {
    this.targetingInterests.update(prev => {
      if (prev.includes(cat)) {
        return prev.filter(c => c !== cat);
      }
      return [...prev, cat];
    });
  }

  handleAddVoice() {
    const form = this.echoForm();
    if (!form.author || !form.content) return;

    const newVoice: ExternalVoice = {
      id: `v-${Date.now()}`,
      author: form.author,
      source: form.source || 'Social',
      content: form.content,
      title: form.title,
      type: form.type,
      avatar: form.avatar,
      url: '#'
    };

    this.formData.update(prev => ({
      ...prev,
      voices: [...prev.voices, newVoice]
    }));

    this.echoForm.update(prev => ({ ...prev, content: '', title: '', author: '' }));
  }

  handleRemoveVoice(id: string) {
    this.formData.update(prev => ({
      ...prev,
      voices: prev.voices.filter(v => v.id !== id)
    }));
  }

  getPreviewArticle(): Article {
    const data = this.formData();
    return {
      id: `preview-${Date.now()}`,
      title: data.title || 'Aperçu',
      summary: data.summary || 'Résumé',
      content: data.content || 'Contenu',
      imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      videoUrl: this.coverType() === 'video' ? data.videoUrl : undefined,
      author: data.author,
      category: data.category,
      timestamp: "Prévisualisation",
      likes: 0,
      comments: 0,
      isExclusive: data.isExclusive,
      externalVoices: data.voices,
      status: 'draft'
    };
  }

  handlePreview() {
    this.preview.emit(this.getPreviewArticle());
  }

  async handlePublish() {
    const data = this.formData();
    if (!data.title || !data.content) return;
    if (this.isScheduled() && !this.scheduledDate()) return;

    this.isSubmitting.set(true);

    try {
      let displayTimestamp = "À l'instant";
      if (this.isScheduled() && this.scheduledDate()) {
        const dateObj = new Date(this.scheduledDate());
        displayTimestamp = `Prévu : ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      }

      const articleId = `art-${Date.now()}`;

      const newArticle: Article = {
        id: articleId,
        title: data.title,
        summary: data.summary,
        content: data.content,
        imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
        videoUrl: this.coverType() === 'video' ? data.videoUrl : undefined,
        author: data.author,
        category: data.category,
        timestamp: displayTimestamp,
        likes: 0,
        comments: 0,
        isExclusive: data.isExclusive,
        externalVoices: data.voices,
        status: this.isScheduled() ? 'scheduled' : 'published',
        scheduledDate: this.isScheduled() ? this.scheduledDate() : undefined
      };

      this.publish.emit(newArticle);

      const bConfig = this.broadcastConfig();
      if (bConfig.active && !this.isScheduled()) {
        const isFlash = bConfig.mode === 'FLASH';
        const isUrgent = bConfig.mode === 'URGENT' || isFlash;

        const campaign: BroadcastCampaign = {
          id: `cp-${Date.now()}`,
          name: `AUTO: ${data.title.substring(0, 20)}`,
          message: data.title.toUpperCase(),
          type: isFlash ? 'ALERT' : 'INFO',
          priority: isFlash ? 10 : (isUrgent ? 8 : 5),
          capping: { maxViews: 0, resetPeriod: 'never' },
          targeting: {
            locations: this.targetingLocations(),
            interests: this.targetingInterests()
          },
          schedule: { startDate: new Date().toISOString(), isActive: true },
          createdAt: new Date().toISOString(),
          linkedArticleId: articleId
        };
        this.broadcastService.addCampaign(campaign);
      }

      this.formData.set({
        title: '', summary: '', content: '', imageUrl: '', videoUrl: '', category: 'Tech', isExclusive: false, author: 'CakeNews', voices: []
      });
      this.coverType.set('image');
      this.isScheduled.set(false);
      this.scheduledDate.set('');
      this.broadcastConfig.set({ active: false, mode: 'STANDARD' });
      this.targetingLocations.set([]);
      this.targetingInterests.set([]);

    } catch (e) {
      this.logger.error('admin.studio.publish', e);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
