import { Injectable, signal, computed } from '@angular/core';
import { TranslationDictionary, TranslationKey } from '../types';

export const DEFAULT_DICTIONARY: TranslationDictionary = {
  id: 'fr',
  name: 'Français',
  isDefault: true,
  translations: {
    'ACTION_LIKE': 'J\'aime',
    'ACTION_SHARE': 'Partager',
    'NAV_HOME': 'Accueil',
    'NAV_FEED': 'Flux',
    'NAV_MESSAGES': 'Messages',
    'NAV_PROFILE': 'Profil',
    'UI_SEARCH': 'Rechercher',
    'UI_SAVE': 'Sauvegarder',
    'UI_CANCEL': 'Annuler',
    'UI_DELETE': 'Supprimer',
    'UI_CLOSE': 'Fermer',
    'ACTION_SAVE': 'Sauvegarder',
    'ADMIN_DASHBOARD': 'Tableau de bord',
    'ADMIN_USERS': 'Utilisateurs',
    'ADMIN_SETTINGS': 'Paramètres',
    'ADMIN_LOGOUT': 'Quitter',
    'ADMIN_TAB_NETWORK': 'Réseau',
    'ADMIN_TAB_FILES': 'Dossiers',
    'ADMIN_TAB_ANTENNA': 'Antenne',
    'ADMIN_TAB_USERS': 'Utilisateurs',
    'ADMIN_TAB_AUDIT': 'Audit',
    'ADMIN_TAB_LANG': 'Localisation'
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  availableDictionaries = signal<TranslationDictionary[]>([DEFAULT_DICTIONARY]);
  currentDictionary = signal<TranslationDictionary>(DEFAULT_DICTIONARY);

  t = computed<(key: TranslationKey, fallback?: string) => string>(() => {
    const dict = this.currentDictionary();
    return (key: TranslationKey, fallback?: string) => {
      return dict.translations[key] || fallback || key;
    };
  });

  setDictionary(dict: TranslationDictionary) {
    this.currentDictionary.set(dict);
  }

  switchDictionary(id: string) {
    const dict = this.availableDictionaries().find(d => d.id === id);
    if (dict) {
      this.currentDictionary.set(dict);
    }
  }

  createDictionary(name: string) {
    const newDict: TranslationDictionary = {
      id: `custom_${Date.now()}`,
      name,
      isDefault: false,
      translations: { ...DEFAULT_DICTIONARY.translations }
    };
    this.availableDictionaries.update(dicts => [...dicts, newDict]);
    this.currentDictionary.set(newDict);
  }

  updateDictionary(id: string, updates: Partial<TranslationDictionary>) {
    this.availableDictionaries.update(dicts => 
      dicts.map(d => d.id === id ? { ...d, ...updates } : d)
    );
    if (this.currentDictionary().id === id) {
      this.currentDictionary.update(d => ({ ...d, ...updates }));
    }
  }

  deleteDictionary(id: string) {
    this.availableDictionaries.update(dicts => dicts.filter(d => d.id !== id));
    if (this.currentDictionary().id === id) {
      this.currentDictionary.set(DEFAULT_DICTIONARY);
    }
  }

  resetToDefault(id: string) {
    this.updateDictionary(id, { translations: { ...DEFAULT_DICTIONARY.translations } });
  }
}
