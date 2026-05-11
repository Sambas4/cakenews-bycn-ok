import { Injectable, computed, signal } from '@angular/core';
import { TranslationDictionary, TranslationKey } from '../types';

const STORAGE_KEY = 'cake_locale';

/**
 * Canonical key set + their French copy. EN values live in
 * {@link EN_DICTIONARY} and must mirror the key list exactly — the
 * unit suite enforces that contract so a missing English string
 * fails CI rather than silently falling back to French.
 */
const FR_TRANSLATIONS: Record<string, string> = {
  // -- Navigation
  'NAV_HOME': 'Accueil',
  'NAV_FEED': 'Flux',
  'NAV_EXPLORE': 'Explorer',
  'NAV_MESSAGES': 'Messages',
  'NAV_PROFILE': 'Profil',

  // -- Generic UI verbs
  'UI_SEARCH': 'Rechercher',
  'UI_SAVE': 'Sauvegarder',
  'UI_CANCEL': 'Annuler',
  'UI_DELETE': 'Supprimer',
  'UI_CLOSE': 'Fermer',
  'UI_BACK': 'Retour',
  'UI_CONFIRM': 'Confirmer',
  'UI_LOADING': 'Chargement',
  'UI_OFFLINE': 'Hors ligne',
  'UI_CACHED': 'En cache',
  'UI_RETRY': 'Réessayer',

  // -- Article interactions
  'ACTION_LIKE': 'J\'aime',
  'ACTION_SAVE': 'Sauvegarder',
  'ACTION_SHARE': 'Partager',
  'ACTION_REPORT': 'Signaler',
  'ACTION_FOLLOW': 'Suivre',
  'ACTION_UNFOLLOW': 'Suivi',
  'ACTION_REPLY': 'Répondre',

  // -- Feed lanes
  'LANE_PULSE': 'Pulse',
  'LANE_PULSE_HINT': 'L\'algorithme te connaît',
  'LANE_RADAR': 'Radar',
  'LANE_RADAR_HINT': 'Breaking, ordre chronologique',
  'LANE_CERCLE': 'Cercle',
  'LANE_CERCLE_HINT': 'Tes voix, ta bulle assumée',

  // -- Consent banner
  'CONSENT_TITLE': 'Confidentialité',
  'CONSENT_BODY': 'Nous collectons uniquement les données nécessaires au fonctionnement de l\'app. Tu peux accepter le suivi anonyme des erreurs pour nous aider à corriger les bugs, ou refuser — l\'expérience reste identique.',
  'CONSENT_ACCEPT': 'Accepter',
  'CONSENT_REJECT': 'Refuser',
  'CONSENT_POLICY_LINK': 'Politique de confidentialité',

  // -- Empty states
  'EMPTY_FEED': 'Aucun article disponible',
  'EMPTY_FEED_HINT': 'Reviens dans un instant, l\'antenne s\'allume.',
  'EMPTY_RADAR': 'Aucun breaking en direct',
  'EMPTY_RADAR_HINT': 'Quand l\'actualité bouge, le Radar la pousse ici en temps réel.',
  'EMPTY_CERCLE': 'Ton Cercle est vide',
  'EMPTY_CERCLE_HINT': 'Like, commente ou sauve un article pour qu\'il rejoigne ton Cercle.',
  'EMPTY_COMMENTS': 'Aucun débat pour le moment. Lance la discussion !',
  'EMPTY_PROFILE_NOT_FOUND': 'Profil introuvable',

  // -- Profile sections
  'PROFILE_MY_SPACE': 'Mon Espace',
  'PROFILE_TAB_ACTIVITY': 'Activité',
  'PROFILE_TAB_SETTINGS': 'Réglages',
  'PROFILE_DNA': 'Ton ADN Lecteur',
  'PROFILE_LIBRARY': 'Bibliothèque',
  'PROFILE_SAVED': 'Sauvegardés',
  'PROFILE_HISTORY': 'Historique',
  'PROFILE_LIKES': 'Likés',
  'PROFILE_EXPORT': 'Exporter mes données (RGPD)',
  'PROFILE_LOGOUT': 'Se déconnecter',
  'PROFILE_DELETE': 'Supprimer le compte',
  'PROFILE_PRIVATE_MODE': 'Mode privé',
  'PROFILE_PRIVATE_MODE_HINT': 'Aucune session enregistrée, l\'algorithme reste à distance',

  // -- Auth
  'AUTH_SIGN_IN': 'Se connecter',
  'AUTH_SIGN_UP': 'Créer un compte',
  'AUTH_RESET': 'Réinitialiser',
  'AUTH_EMAIL': 'Email',
  'AUTH_PASSWORD': 'Mot de passe',
  'AUTH_FORGOT': 'Mot de passe oublié ?',
  'AUTH_OR': 'ou',

  // -- Admin
  'ADMIN_DASHBOARD': 'Tableau de bord',
  'ADMIN_USERS': 'Utilisateurs',
  'ADMIN_SETTINGS': 'Paramètres',
  'ADMIN_LOGOUT': 'Quitter',
  'ADMIN_TAB_NETWORK': 'Réseau',
  'ADMIN_TAB_FILES': 'Dossiers',
  'ADMIN_TAB_ANTENNA': 'Antenne',
  'ADMIN_TAB_USERS': 'Utilisateurs',
  'ADMIN_TAB_AUDIT': 'Audit',
  'ADMIN_TAB_LANG': 'Localisation',
};

const EN_TRANSLATIONS: Record<string, string> = {
  // -- Navigation
  'NAV_HOME': 'Home',
  'NAV_FEED': 'Feed',
  'NAV_EXPLORE': 'Explore',
  'NAV_MESSAGES': 'Messages',
  'NAV_PROFILE': 'Profile',

  // -- Generic UI verbs
  'UI_SEARCH': 'Search',
  'UI_SAVE': 'Save',
  'UI_CANCEL': 'Cancel',
  'UI_DELETE': 'Delete',
  'UI_CLOSE': 'Close',
  'UI_BACK': 'Back',
  'UI_CONFIRM': 'Confirm',
  'UI_LOADING': 'Loading',
  'UI_OFFLINE': 'Offline',
  'UI_CACHED': 'Cached',
  'UI_RETRY': 'Retry',

  // -- Article interactions
  'ACTION_LIKE': 'Like',
  'ACTION_SAVE': 'Save',
  'ACTION_SHARE': 'Share',
  'ACTION_REPORT': 'Report',
  'ACTION_FOLLOW': 'Follow',
  'ACTION_UNFOLLOW': 'Following',
  'ACTION_REPLY': 'Reply',

  // -- Feed lanes
  'LANE_PULSE': 'Pulse',
  'LANE_PULSE_HINT': 'The algorithm knows you',
  'LANE_RADAR': 'Radar',
  'LANE_RADAR_HINT': 'Breaking news, chronological',
  'LANE_CERCLE': 'Circle',
  'LANE_CERCLE_HINT': 'Your voices, your chosen bubble',

  // -- Consent banner
  'CONSENT_TITLE': 'Privacy',
  'CONSENT_BODY': 'We only collect what the app needs to function. You can opt in to anonymous error tracking to help us fix bugs, or decline — the experience is identical.',
  'CONSENT_ACCEPT': 'Accept',
  'CONSENT_REJECT': 'Decline',
  'CONSENT_POLICY_LINK': 'Privacy policy',

  // -- Empty states
  'EMPTY_FEED': 'No articles available',
  'EMPTY_FEED_HINT': 'Hang on, we\'re lighting up the antenna.',
  'EMPTY_RADAR': 'Nothing breaking right now',
  'EMPTY_RADAR_HINT': 'When the news shifts, the Radar pushes it here in real time.',
  'EMPTY_CERCLE': 'Your Circle is empty',
  'EMPTY_CERCLE_HINT': 'Like, comment or save an article to bring it into your Circle.',
  'EMPTY_COMMENTS': 'No debate yet. Start the conversation!',
  'EMPTY_PROFILE_NOT_FOUND': 'Profile not found',

  // -- Profile sections
  'PROFILE_MY_SPACE': 'My space',
  'PROFILE_TAB_ACTIVITY': 'Activity',
  'PROFILE_TAB_SETTINGS': 'Settings',
  'PROFILE_DNA': 'Your reader DNA',
  'PROFILE_LIBRARY': 'Library',
  'PROFILE_SAVED': 'Saved',
  'PROFILE_HISTORY': 'History',
  'PROFILE_LIKES': 'Likes',
  'PROFILE_EXPORT': 'Export my data (GDPR)',
  'PROFILE_LOGOUT': 'Sign out',
  'PROFILE_DELETE': 'Delete account',
  'PROFILE_PRIVATE_MODE': 'Private mode',
  'PROFILE_PRIVATE_MODE_HINT': 'No session recorded, the algorithm stays at arm\'s length',

  // -- Auth
  'AUTH_SIGN_IN': 'Sign in',
  'AUTH_SIGN_UP': 'Sign up',
  'AUTH_RESET': 'Reset',
  'AUTH_EMAIL': 'Email',
  'AUTH_PASSWORD': 'Password',
  'AUTH_FORGOT': 'Forgot your password?',
  'AUTH_OR': 'or',

  // -- Admin
  'ADMIN_DASHBOARD': 'Dashboard',
  'ADMIN_USERS': 'Users',
  'ADMIN_SETTINGS': 'Settings',
  'ADMIN_LOGOUT': 'Quit',
  'ADMIN_TAB_NETWORK': 'Network',
  'ADMIN_TAB_FILES': 'Files',
  'ADMIN_TAB_ANTENNA': 'Antenna',
  'ADMIN_TAB_USERS': 'Users',
  'ADMIN_TAB_AUDIT': 'Audit',
  'ADMIN_TAB_LANG': 'Localisation',
};

export const FR_DICTIONARY: TranslationDictionary = {
  id: 'fr',
  name: 'Français',
  isDefault: true,
  translations: FR_TRANSLATIONS,
};

export const EN_DICTIONARY: TranslationDictionary = {
  id: 'en',
  name: 'English',
  translations: EN_TRANSLATIONS,
};

export const DEFAULT_DICTIONARY = FR_DICTIONARY;

/** Bundled dictionaries ship with the app. Custom user dictionaries
 *  (admin localisation panel) layer on top. */
const BUILTIN_DICTIONARIES: TranslationDictionary[] = [FR_DICTIONARY, EN_DICTIONARY];

@Injectable({ providedIn: 'root' })
export class TranslationService {
  availableDictionaries = signal<TranslationDictionary[]>(BUILTIN_DICTIONARIES);
  currentDictionary = signal<TranslationDictionary>(this.pickInitial());

  /** Convenience: shorthand for `currentDictionary().id`. */
  currentLocale = computed(() => this.currentDictionary().id);

  /**
   * Reactive translation accessor. Components call `t()('KEY', 'fallback')`.
   * Returns the localized string for the current dictionary, falls back
   * to the caller-provided default, then to the key itself.
   */
  t = computed<(key: TranslationKey, fallback?: string) => string>(() => {
    const dict = this.currentDictionary();
    return (key: TranslationKey, fallback?: string) => dict.translations[key] ?? fallback ?? key;
  });

  setDictionary(dict: TranslationDictionary) {
    this.currentDictionary.set(dict);
    this.persist(dict.id);
  }

  switchDictionary(id: string) {
    const dict = this.availableDictionaries().find(d => d.id === id);
    if (dict) this.setDictionary(dict);
  }

  createDictionary(name: string) {
    const newDict: TranslationDictionary = {
      id: `custom_${Date.now()}`,
      name,
      isDefault: false,
      translations: { ...DEFAULT_DICTIONARY.translations },
    };
    this.availableDictionaries.update(dicts => [...dicts, newDict]);
    this.setDictionary(newDict);
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
    if (BUILTIN_DICTIONARIES.some(d => d.id === id)) return; // protect the shipped pair
    this.availableDictionaries.update(dicts => dicts.filter(d => d.id !== id));
    if (this.currentDictionary().id === id) this.setDictionary(DEFAULT_DICTIONARY);
  }

  resetToDefault(id: string) {
    const base = BUILTIN_DICTIONARIES.find(d => d.id === id) ?? DEFAULT_DICTIONARY;
    this.updateDictionary(id, { translations: { ...base.translations } });
  }

  /**
   * Resolve the initial dictionary at construction time:
   *   1. Saved preference in localStorage wins.
   *   2. Otherwise, the browser's preferred language if we ship a
   *      matching dictionary (FR / EN today).
   *   3. Otherwise, French.
   */
  private pickInitial(): TranslationDictionary {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const match = BUILTIN_DICTIONARIES.find(d => d.id === saved);
        if (match) return match;
      }
    } catch { /* ignore */ }

    try {
      if (typeof navigator !== 'undefined' && navigator.language) {
        const prefix = navigator.language.slice(0, 2).toLowerCase();
        const match = BUILTIN_DICTIONARIES.find(d => d.id === prefix);
        if (match) return match;
      }
    } catch { /* ignore */ }

    return DEFAULT_DICTIONARY;
  }

  private persist(id: string): void {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }
}
