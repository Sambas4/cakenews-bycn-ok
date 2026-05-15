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
  'OFFLINE_BANNER': 'Hors ligne — contenu en cache',

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
  'PROFILE_EDIT_TITLE': 'Éditer le profil',
  'PROFILE_AVATAR': 'Avatar',
  'PROFILE_AVATAR_BG': 'Couleur de fond',
  'PROFILE_DISPLAY_NAME': 'Nom affiché',
  'PROFILE_USERNAME': '@ pseudo',
  'PROFILE_BIO': 'Bio',
  'PROFILE_BIO_PLACEHOLDER': 'Quelques mots sur toi…',
  'PROFILE_USERNAME_HINT': 'Lettres, chiffres et _ uniquement, 3 à 24 caractères.',
  'PROFILE_RESUME_READING': 'Reprends ta lecture',
  'PROFILE_NOTIFS_SECTION': 'Notifications',
  'PROFILE_PRIVACY_SECTION': 'Confidentialité',
  'PROFILE_A11Y_SECTION': 'Accessibilité',
  'PROFILE_LEGAL_TERMS': 'CGU',
  'PROFILE_LEGAL_PRIVACY': 'Confidentialité',
  'PROFILE_LEGAL_MENTIONS': 'Mentions',
  'PROFILE_NOTIF_REPLIES': 'Réponses & mentions',
  'PROFILE_NOTIF_REPLIES_HINT': 'Quand on te cite ou te répond',
  'PROFILE_NOTIF_DM': 'Messages privés',
  'PROFILE_NOTIF_DM_HINT': 'Pings chiffrés',
  'PROFILE_NOTIF_BREAKING': 'Breaking news',
  'PROFILE_NOTIF_BREAKING_HINT': 'Alertes urgentes uniquement',
  'PROFILE_NOTIF_DIGEST': 'Digest hebdo',
  'PROFILE_NOTIF_DIGEST_HINT': 'Récap des moments forts',
  'PROFILE_PRIVACY_ACTIVITY': 'Activité visible',
  'PROFILE_PRIVACY_DM_SCOPE': 'Messages directs',
  'PROFILE_DM_EVERYONE': 'Tous',
  'PROFILE_DM_VERIFIED': 'Vérifiés',
  'PROFILE_DM_NONE': 'Personne',
  'PROFILE_A11Y_REDUCE_MOTION': 'Réduire les animations',
  'PROFILE_A11Y_LARGER_TEXT': 'Texte plus grand',
  'PROFILE_INTERESTS': 'Personnaliser l\'algorithme',
  'PROFILE_INTERESTS_ACTIVE': 'actifs',
  'PROFILE_SENSITIVE': 'Contenus sensibles & adultes',

  // -- Search
  'SEARCH_TITLE': 'Recherche',
  'SEARCH_PLACEHOLDER': 'Sujets, articles, auteurs…',
  'SEARCH_PROMPT': 'Recherchez dans l\'audit CakeNews',
  'SEARCH_NO_RESULTS': 'Aucun résultat trouvé pour',
  'SEARCH_PEOPLE_HEADING': 'Auteurs',
  'SEARCH_ARTICLES_HEADING': 'Articles',
  'SEARCH_CLEAR': 'Effacer la recherche',

  // -- Library
  'LIBRARY_BACK': 'Retour',
  'LIBRARY_SAVED_EMPTY_TITLE': 'Rien dans tes signets',
  'LIBRARY_SAVED_EMPTY_HINT': 'Touche le marque-page sur un article pour le retrouver ici.',
  'LIBRARY_HISTORY_EMPTY_TITLE': 'Pas encore de lecture',
  'LIBRARY_HISTORY_EMPTY_HINT': 'Les articles que tu lis viennent s\'aligner ici dans l\'ordre.',
  'LIBRARY_LIKES_EMPTY_TITLE': 'Aucun like pour le moment',
  'LIBRARY_LIKES_EMPTY_HINT': 'Touche le cœur d\'un article que tu approuves pour l\'archiver.',
  'LIBRARY_ARTICLE_COUNT': 'article(s)',

  // -- Messaging
  'MSG_TITLE': 'Messagerie',
  'MSG_TAB_PRIVATE': 'Privé',
  'MSG_TAB_ALERTS': 'Alertes',
  'MSG_TAB_SYSTEM': 'Système',
  'MSG_EMPTY_DIRECT': 'Aucun message',
  'MSG_EMPTY_DIRECT_HINT': 'Démarre une conversation chiffrée avec un autre lecteur ou journaliste.',
  'MSG_EMPTY_NOTIF': 'Aucune alerte',
  'MSG_EMPTY_NOTIF_HINT': 'Tu seras notifié si un débat décolle ou si quelqu\'un répond à tes commentaires.',
  'MSG_EMPTY_ADMIN': 'Tout est calme',
  'MSG_EMPTY_ADMIN_HINT': 'L\'équipe CakeNews te contactera ici en cas de besoin.',
  'MSG_SEARCH_PLACEHOLDER': 'Rechercher une conversation',

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
  'OFFLINE_BANNER': 'Offline — cached content',

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
  'PROFILE_EDIT_TITLE': 'Edit profile',
  'PROFILE_AVATAR': 'Avatar',
  'PROFILE_AVATAR_BG': 'Background colour',
  'PROFILE_DISPLAY_NAME': 'Display name',
  'PROFILE_USERNAME': '@ username',
  'PROFILE_BIO': 'Bio',
  'PROFILE_BIO_PLACEHOLDER': 'A few words about you…',
  'PROFILE_USERNAME_HINT': 'Letters, digits and _ only, 3 to 24 characters.',
  'PROFILE_RESUME_READING': 'Pick up where you left off',
  'PROFILE_NOTIFS_SECTION': 'Notifications',
  'PROFILE_PRIVACY_SECTION': 'Privacy',
  'PROFILE_A11Y_SECTION': 'Accessibility',
  'PROFILE_LEGAL_TERMS': 'Terms',
  'PROFILE_LEGAL_PRIVACY': 'Privacy',
  'PROFILE_LEGAL_MENTIONS': 'Legal',
  'PROFILE_NOTIF_REPLIES': 'Replies & mentions',
  'PROFILE_NOTIF_REPLIES_HINT': 'When someone cites or replies to you',
  'PROFILE_NOTIF_DM': 'Direct messages',
  'PROFILE_NOTIF_DM_HINT': 'Encrypted pings',
  'PROFILE_NOTIF_BREAKING': 'Breaking news',
  'PROFILE_NOTIF_BREAKING_HINT': 'Urgent alerts only',
  'PROFILE_NOTIF_DIGEST': 'Weekly digest',
  'PROFILE_NOTIF_DIGEST_HINT': 'Recap of the highlights',
  'PROFILE_PRIVACY_ACTIVITY': 'Activity visible',
  'PROFILE_PRIVACY_DM_SCOPE': 'Direct messages',
  'PROFILE_DM_EVERYONE': 'Everyone',
  'PROFILE_DM_VERIFIED': 'Verified',
  'PROFILE_DM_NONE': 'Nobody',
  'PROFILE_A11Y_REDUCE_MOTION': 'Reduce animations',
  'PROFILE_A11Y_LARGER_TEXT': 'Larger text',
  'PROFILE_INTERESTS': 'Tune the algorithm',
  'PROFILE_INTERESTS_ACTIVE': 'active',
  'PROFILE_SENSITIVE': 'Sensitive & adult content',

  // -- Search
  'SEARCH_TITLE': 'Search',
  'SEARCH_PLACEHOLDER': 'Topics, articles, authors…',
  'SEARCH_PROMPT': 'Search CakeNews\' audit feed',
  'SEARCH_NO_RESULTS': 'No results for',
  'SEARCH_PEOPLE_HEADING': 'Authors',
  'SEARCH_ARTICLES_HEADING': 'Articles',
  'SEARCH_CLEAR': 'Clear search',

  // -- Library
  'LIBRARY_BACK': 'Back',
  'LIBRARY_SAVED_EMPTY_TITLE': 'Nothing in your bookmarks',
  'LIBRARY_SAVED_EMPTY_HINT': 'Tap the bookmark icon on an article to keep it here.',
  'LIBRARY_HISTORY_EMPTY_TITLE': 'No reading history yet',
  'LIBRARY_HISTORY_EMPTY_HINT': 'Articles you read line up here in order.',
  'LIBRARY_LIKES_EMPTY_TITLE': 'No likes yet',
  'LIBRARY_LIKES_EMPTY_HINT': 'Tap the heart on an article you approve to archive it.',
  'LIBRARY_ARTICLE_COUNT': 'article(s)',

  // -- Messaging
  'MSG_TITLE': 'Messages',
  'MSG_TAB_PRIVATE': 'Private',
  'MSG_TAB_ALERTS': 'Alerts',
  'MSG_TAB_SYSTEM': 'System',
  'MSG_EMPTY_DIRECT': 'No messages',
  'MSG_EMPTY_DIRECT_HINT': 'Start an encrypted conversation with another reader or journalist.',
  'MSG_EMPTY_NOTIF': 'No alerts',
  'MSG_EMPTY_NOTIF_HINT': 'You\'ll be notified when a debate heats up or someone replies to your comments.',
  'MSG_EMPTY_ADMIN': 'All quiet',
  'MSG_EMPTY_ADMIN_HINT': 'CakeNews staff will reach out here when needed.',
  'MSG_SEARCH_PLACEHOLDER': 'Search a conversation',

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
