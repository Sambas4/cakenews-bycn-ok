import { Component, signal, computed, inject, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService, DEFAULT_DICTIONARY } from '../../services/translation.service';
import { TranslationDictionary } from '../../types';

@Component({
  selector: 'app-translation-row',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
      <div class="flex justify-between items-center mb-3">
        <span class="text-[10px] font-black uppercase text-zinc-500 truncate max-w-[80%] bg-black px-2 py-1 rounded border border-zinc-800 select-all tracking-wider">
          {{ k() }}
        </span>
        <lucide-icon name="languages" class="w-3 h-3 text-zinc-700"></lucide-icon>
      </div>
      
      @if (!isDefaultDict()) {
        <p class="text-[10px] text-zinc-600 mb-2 truncate italic">
          Orig: "{{ originalVal() }}"
        </p>
      }

      <textarea 
        [ngModel]="localValue()"
        (ngModelChange)="localValue.set($event)"
        (blur)="handleBlur()"
        rows="2"
        placeholder="Votre traduction..."
        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white font-bold focus:border-purple-500 outline-none transition-all resize-none leading-relaxed placeholder:text-zinc-700"
      ></textarea>
    </div>
  `
})
export class TranslationRowComponent {
  k = signal<string>('');
  val = signal<string>('');
  originalVal = signal<string>('');
  isDefaultDict = signal<boolean>(false);
  
  update = output<{key: string, val: string}>();

  localValue = signal<string>('');

  constructor() {
    effect(() => {
      this.localValue.set(this.val());
    }, { allowSignalWrites: true });
  }

  handleBlur() {
    if (this.localValue() !== this.val()) {
      this.update.emit({ key: this.k(), val: this.localValue() });
    }
  }
}

@Component({
  selector: 'app-admin-localisation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslationRowComponent],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-zinc-950 font-sans relative overflow-hidden">
      
      <!-- 1. GESTION DES PACKS (Responsive) -->
      <div class="flex-shrink-0 bg-zinc-925 border-b md:border-b-0 md:border-r border-zinc-800"
           [ngClass]="showPackListMobile() ? 'absolute inset-0 z-50 flex flex-col' : 'h-auto md:h-full md:w-80 md:flex flex-col'">
          
          <!-- Mobile Header Toggle -->
          <div 
            (click)="showPackListMobile.set(!showPackListMobile())"
            class="md:hidden p-4 flex items-center justify-between bg-zinc-950 border-b border-zinc-800 active:bg-zinc-900 cursor-pointer"
          >
              <div class="flex items-center gap-3">
                  <lucide-icon name="globe" class="w-5 h-5 text-purple-500"></lucide-icon>
                  <div class="flex flex-col">
                      <span class="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Langue Active</span>
                      <span class="text-sm font-black uppercase text-white tracking-wide">{{ currentDictionary().name }}</span>
                  </div>
              </div>
              <lucide-icon name="chevron-down" class="w-5 h-5 text-zinc-500 transition-transform" [class.rotate-180]="showPackListMobile()"></lucide-icon>
          </div>

          <!-- List Content -->
          <div class="flex-col h-full bg-zinc-950 md:bg-transparent" [ngClass]="!showPackListMobile() ? 'hidden md:flex' : 'flex'">
              <div class="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 hidden md:flex">
                  <div class="flex items-center gap-3">
                      <lucide-icon name="globe" class="w-5 h-5 text-purple-500"></lucide-icon>
                      <h2 class="text-sm font-black uppercase text-white tracking-widest">Packs de Langue</h2>
                  </div>
              </div>

              <div class="p-4 border-b border-zinc-800 shrink-0">
                  @if (!isCreating()) {
                      <button 
                        (click)="isCreating.set(true)"
                        class="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                          <lucide-icon name="plus" class="w-4 h-4"></lucide-icon> Créer une langue
                      </button>
                  } @else {
                      <div class="flex gap-2">
                          <input 
                            type="text" 
                            [(ngModel)]="newPackName"
                            placeholder="Nom (ex: Argot)"
                            class="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white outline-none"
                            autofocus
                          />
                          <button (click)="handleCreate()" class="p-3 bg-emerald-500 text-black rounded-lg">
                              <lucide-icon name="check" class="w-5 h-5"></lucide-icon>
                          </button>
                      </div>
                  }
              </div>

              <div class="flex-1 overflow-y-auto p-2 space-y-2">
                  @for (dict of availableDictionaries(); track dict.id) {
                      <div 
                        (click)="switchDictionary(dict.id)"
                        class="p-4 rounded-xl cursor-pointer border-2 transition-all group relative"
                        [ngClass]="currentDictionary().id === dict.id ? 'bg-zinc-800 border-purple-500' : 'bg-transparent border-transparent hover:bg-zinc-900'"
                      >
                          <div class="flex justify-between items-center">
                              <span class="text-xs font-black uppercase tracking-wide" [ngClass]="currentDictionary().id === dict.id ? 'text-white' : 'text-zinc-500'">
                                  {{ dict.name }}
                              </span>
                              @if (currentDictionary().id === dict.id) {
                                  <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                              }
                          </div>
                          
                          @if (!dict.isDefault) {
                              <button 
                                (click)="handleDelete(dict.id, $event)"
                                class="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-zinc-600 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                  <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                              </button>
                          }
                      </div>
                  }
              </div>
          </div>
      </div>

      <!-- 2. EDITEUR (Right Panel) -->
      <div class="flex-1 flex flex-col bg-black min-w-0 h-full">
          
          <!-- HEADER EDITEUR -->
          <div class="h-20 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0 gap-4">
              <div class="flex flex-col overflow-hidden">
                  <span class="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Édition en cours</span>
                  <h1 class="text-xl font-black text-white uppercase tracking-tight truncate">
                      <span class="text-purple-500">{{ currentDictionary().name }}</span>
                  </h1>
              </div>
              
              <div class="flex gap-2 shrink-0">
                  <button 
                    (click)="handleReset()"
                    class="p-3 md:px-4 md:py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition-colors border border-zinc-800"
                    title="Restaurer par défaut"
                  >
                      <lucide-icon name="rotate-ccw" class="w-5 h-5"></lucide-icon>
                  </button>
                  
                  <button 
                    (click)="handleManualSave()"
                    class="px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                    [ngClass]="saveStatus() === 'success' ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-zinc-200'"
                  >
                      @if (saveStatus() === 'success') {
                          <lucide-icon name="check-circle-2" class="w-4 h-4"></lucide-icon> SUCCÈS
                      } @else {
                          <lucide-icon name="save" class="w-4 h-4"></lucide-icon> SAUVER
                      }
                  </button>
              </div>
          </div>

          <!-- FILTRES & RECHERCHE -->
          <div class="p-4 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-925 shrink-0">
              <div class="relative w-full">
                  <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"></lucide-icon>
                  <input 
                    type="text" 
                    [(ngModel)]="searchTerm"
                    placeholder="Rechercher une clé ou un texte..."
                    class="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-purple-500 outline-none h-12"
                  />
              </div>
              <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  @for (cat of categories; track cat) {
                      <button 
                        (click)="activeCategory.set(cat)"
                        class="flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border"
                        [ngClass]="activeCategory() === cat ? 'bg-zinc-800 text-white border-zinc-600' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-700'"
                      >
                          {{ cat }}
                      </button>
                  }
              </div>
          </div>

          <!-- LISTE DES CLÉS (SCROLLABLE AREA) -->
          <div class="flex-1 overflow-y-auto p-4 pb-40 md:pb-32 overscroll-contain">
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  @for (key of filteredKeys().slice(0, 100); track key) {
                      <app-translation-row 
                          [k]="key" 
                          [val]="currentDictionary().translations[key]" 
                          [originalVal]="defaultDictionary.translations[key]" 
                          [isDefaultDict]="currentDictionary().isDefault || false"
                          (update)="handleValueChange($event.key, $event.val)"
                      ></app-translation-row>
                  }
              </div>
              
              @if (filteredKeys().length === 0) {
                  <div class="flex flex-col items-center justify-center h-64 text-zinc-600">
                      <lucide-icon name="search" class="w-12 h-12 mb-4 opacity-20"></lucide-icon>
                      <p class="text-xs font-mono uppercase tracking-widest">Aucune traduction trouvée</p>
                  </div>
              }
              
              @if (filteredKeys().length > 100) {
                  <div class="py-8 text-center">
                      <p class="text-[10px] text-zinc-500 font-mono uppercase">
                          Affichage limité à 100 résultats. Utilisez la recherche pour affiner.
                      </p>
                  </div>
              }
          </div>
      </div>
    </div>
  `
})
export class AdminLocalisationComponent {
  translationService = inject(TranslationService);
  
  availableDictionaries = this.translationService.availableDictionaries;
  currentDictionary = this.translationService.currentDictionary;
  defaultDictionary = DEFAULT_DICTIONARY;

  searchTerm = signal('');
  newPackName = signal('');
  isCreating = signal(false);
  showPackListMobile = signal(false);
  activeCategory = signal<'ALL' | 'NAV' | 'ACTION' | 'UI' | 'ADMIN'>('ALL');
  saveStatus = signal<'idle' | 'saving' | 'success'>('idle');

  categories: ('ALL' | 'NAV' | 'ACTION' | 'UI' | 'ADMIN')[] = ['ALL', 'NAV', 'ACTION', 'UI', 'ADMIN'];

  filteredKeys = computed(() => {
    const dict = this.currentDictionary();
    const search = this.searchTerm().toLowerCase();
    const category = this.activeCategory();

    return Object.keys(dict.translations).filter(key => {
      const matchesSearch = key.toLowerCase().includes(search) || 
                            dict.translations[key].toLowerCase().includes(search);
      
      if (!matchesSearch) return false;

      if (category === 'NAV') return key.startsWith('NAV_');
      if (category === 'ACTION') return key.startsWith('ACTION_');
      if (category === 'UI') return key.startsWith('UI_') || key.startsWith('HOF_') || key.startsWith('TROPHY_');
      if (category === 'ADMIN') return key.startsWith('ADMIN_');
      
      return true;
    });
  });

  handleBack(): boolean {
    if (this.isCreating()) {
      this.isCreating.set(false);
      this.newPackName.set('');
      return true;
    }
    if (this.showPackListMobile()) {
      this.showPackListMobile.set(false);
      return true;
    }
    return false;
  }

  handleValueChange(key: string, value: string) {
    const currentDict = this.currentDictionary();
    const newTranslations = { ...currentDict.translations, [key]: value };
    this.translationService.updateDictionary(currentDict.id, { translations: newTranslations });
  }

  handleCreate() {
    const name = this.newPackName().trim();
    if (name) {
      this.translationService.createDictionary(name);
      this.newPackName.set('');
      this.isCreating.set(false);
      this.showPackListMobile.set(false);
    }
  }

  switchDictionary(id: string) {
    this.translationService.switchDictionary(id);
    this.showPackListMobile.set(false);
  }

  handleDelete(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Supprimer définitivement ce pack ?')) {
      this.translationService.deleteDictionary(id);
    }
  }

  handleReset() {
    if (confirm('Réinitialiser toutes les traductions de ce pack ?')) {
      this.translationService.resetToDefault(this.currentDictionary().id);
    }
  }

  handleManualSave() {
    this.saveStatus.set('saving');
    setTimeout(() => {
      this.saveStatus.set('success');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    }, 600);
  }
}
