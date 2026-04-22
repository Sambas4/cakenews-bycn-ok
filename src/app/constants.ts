
import { Category } from './types';

// Groupes de configuration pour l'UI - Organisation thématique
export const THEME_GROUPS = {
  ACTUALITES: ['Politique', 'International', 'Société', 'Économie', 'Justice', 'Environnement'] as Category[],
  FUTUR: ['Tech', 'IA', 'Crypto', 'Science', 'Espace', 'Startups'] as Category[],
  LIFESTYLE: ['Culture', 'Mode', 'Luxe', 'Food', 'Voyage', 'Architecture'] as Category[],
  DIVERTISSEMENT: ['Cinéma', 'Musique', 'People', 'Gaming', 'Manga', 'Humour'] as Category[],
  // RETOUR AUX GÉNÉRAUX
  SPORTS: ['Football', 'NBA', 'F1', 'MMA', 'Tennis'] as Category[],
  // CONTENU SENSIBLE & ADULTE
  SENSITIVE: ['Guerre', 'Faits Divers', 'Paranormal', 'Opinion Choc'] as Category[],
  UNCENSORED: ['Mature', 'Nudité', 'Charme'] as Category[]
};

// Liste plate pour compatibilité legacy et itération
export const CATEGORIES: Category[] = [
  ...THEME_GROUPS.ACTUALITES,
  ...THEME_GROUPS.FUTUR,
  ...THEME_GROUPS.LIFESTYLE,
  ...THEME_GROUPS.DIVERTISSEMENT,
  ...THEME_GROUPS.SPORTS,
  ...THEME_GROUPS.SENSITIVE,
  ...THEME_GROUPS.UNCENSORED
];

export const CATEGORY_COLORS: Record<Category, string> = {
  // ACTUALITES
  'Politique': '#7c3aed',
  'International': '#4338ca',
  'Société': '#6366f1',
  'Économie': '#059669',
  'Justice': '#1e40af',
  'Environnement': '#10b981',

  // FUTUR
  'Tech': '#4f46e5',
  'IA': '#06b6d4',
  'Crypto': '#f59e0b',
  'Science': '#0ea5e9',
  'Espace': '#6d28d9',
  'Startups': '#14b8a6',

  // LIFESTYLE
  'Culture': '#db2777',
  'Mode': '#be185d',
  'Luxe': '#000000',
  'Food': '#d97706',
  'Voyage': '#f97316',
  'Architecture': '#78716c',

  // DIVERTISSEMENT
  'Cinéma': '#e11d48',
  'Musique': '#8b5cf6',
  'People': '#f472b6',
  'Gaming': '#8b5cf6',
  'Manga': '#ef4444',
  'Humour': '#eab308',

  // SPORT GÉNÉRAL
  'Football': '#16a34a',
  'NBA': '#ea580c',
  'F1': '#dc2626',
  'MMA': '#7f1d1d',
  'Tennis': '#65a30d',
  
  // COMPATIBILITÉ (Au cas où)
  'Real Madrid': '#e2e8f0', 
  'FC Barcelone': '#1e3a8a',
  'PSG': '#1e40af',
  'OM': '#38bdf8',
  'Lakers': '#facc15',
  'Ferrari': '#ef4444',

  // SENSITIVE
  'Guerre': '#450a0a', 
  'Faits Divers': '#3f3f46', 
  'Paranormal': '#581c87', 
  'Opinion Choc': '#be123c',
  
  // UNCENSORED
  'Mature': '#18181b', // Noir
  'Nudité': '#fb7185', // Rose chair vif
  'Charme': '#f472b6' // Rose
};

export const getTextColor = (category: Category, isExclusive?: boolean): string => {
  if (isExclusive) return 'text-white';
  
  // Cas spécifiques pour contraste sur fond clair
  const lightBackgrounds: Category[] = ['Crypto', 'Humour', 'Food', 'Lakers', 'Real Madrid', 'Nudité', 'Charme'];
  if (lightBackgrounds.includes(category)) return 'text-black';
  
  return 'text-white';
};
