
export type Category = 
  // ACTUALITÉS
  'Politique' | 'International' | 'Société' | 'Économie' | 'Justice' | 'Environnement' |
  // FUTUR & TECH
  'Tech' | 'IA' | 'Crypto' | 'Science' | 'Espace' | 'Startups' |
  // LIFESTYLE
  'Culture' | 'Mode' | 'Luxe' | 'Food' | 'Voyage' | 'Architecture' |
  // DIVERTISSEMENT
  'Cinéma' | 'Musique' | 'People' | 'Gaming' | 'Manga' | 'Humour' |
  // SPORT GÉNÉRAL
  'Football' | 'NBA' | 'F1' | 'MMA' | 'Tennis' | 
  // CLUBS & ÉQUIPES (Granularité)
  'Real Madrid' | 'FC Barcelone' | 'PSG' | 'OM' | 'Lakers' | 'Ferrari' |
  // ZONE ROUGE & EXPLICITE (Sans filtre)
  'Guerre' | 'Faits Divers' | 'Paranormal' | 'Opinion Choc' | 
  // ADULTE / NON CENSURÉ
  'Mature' | 'Nudité' | 'Charme';

// --- SYSTÈME DE TRADUCTION ---
export type TranslationKey = string; // ex: 'ACTION_LIKE', 'NAV_HOME'

export interface TranslationDictionary {
  id: string;
  name: string; // ex: "Français", "Argot", "Fang"
  isDefault?: boolean;
  translations: Record<TranslationKey, string>;
}

export interface ExternalVoice {
  id: string;
  source: string;
  author: string;
  avatar: string;
  type: 'video' | 'audio' | 'text' | 'tweet';
  title?: string;
  content: string;
  url: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  likes?: number;
  replyTo?: {
    author: string;
    content: string;
  };
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  flashAudioUrl?: string;
  imageUrl: string;
  videoUrl?: string;
  author: string;
  category: Category;
  timestamp: string;
  likes: number;
  comments: number;
  isExclusive?: boolean;
  isSensitive?: boolean;
  externalVoices?: ExternalVoice[];
  roomComments?: Comment[];
  status?: 'published' | 'scheduled' | 'draft';
  scheduledDate?: string;
  
  // Cognitive Metadata for Advanced Feed Engine
  metadata?: {
    tone: 'Analytique' | 'Inspirant' | 'Polémique' | 'Divertissant' | 'Factuel';
    format: 'LongRead' | 'Snackable' | 'Video' | 'Visual';
    complexity: 'Beginner' | 'Expert' | 'Mainstream';
    tags: string[];
  };

  // Vibe Check
  vibeCheck?: {
    choque: number;
    sceptique: number;
    bullish: number;
    valide: number;
  };

  // Reseau Stats
  views?: number;
  readRate?: number;
  avgTime?: string;
  virality?: number;
  reports?: number;
  disputes?: number;
  certifiedBy?: string;
}

export interface Message {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isOfficial?: boolean;
  articleId?: string;
}

export type NotificationType = 'like' | 'mention' | 'report' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  time: string;
  articleId?: string;
  isRead: boolean;
}

export interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  timestamp: string;
}

export interface ReportTicket {
  id: string;
  targetId: string; 
  targetType: 'ARTICLE' | 'COMMENT' | 'USER';
  targetTitle?: string;
  targetContentPreview?: string;
  reason: 'truth' | 'ethics' | 'tech';
  description: string;
  reporter: string;
  reporterScore: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  assignedTo?: string;
  timestamp: string;
  evidenceLinks?: string[];
  internalNotes?: AuditLog[];
}

export type AppViewMode = 'AUTH' | 'APP' | 'ADMIN';

export enum AppTab {
  HOME = 'home',
  FEED = 'feed',
  MESSAGES = 'messages',
  PROFILE = 'profile'
}

export enum MessageTab {
  NOTIFICATIONS = 'notifications',
  PRIVATE = 'private',
  CAKENEWS = 'cakenews'
}

export enum AdminTab {
  RESEAU = 'reseau',
  DOSSIERS = 'dossiers',
  ANTENNE = 'antenne',
  UTILISATEURS = 'utilisateurs',
  AUDIT = 'audit',
  LOCALISATION = 'localisation'
}

export interface UserLocation {
    neighborhood: string;
    city: string;
    country: string;
    isSet: boolean;
}

export interface UserStats {
    likesGiven: number;
    likesReceived: number;
    commentsPosted: number;
    reportsReceived: number;
    trustScore: number;
    postsRead?: number;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  username?: string;
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  moderationNote?: string;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  username?: string;
  updatedAt?: string;
}

// Keep UserData as legacy for now if needed, but redefine it to match UserProfile structure or avoid breaking.
export interface UserData {
  id: string; // Mapping to uid
  name: string; // Mapping to displayName
  handle: string; // Mapping to username
  email?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR'; // Not persisted on client side directly based on rules, computed by claims
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING';
  joinDate: string;
  avatar: string; // Mapping to photoURL
  location: UserLocation; // Might need to be moved to a private sub-collection or local settings
  stats: UserStats; // Should be sub-collections, keeping for UI compile
}

export interface BroadcastCampaign {
    id: string;
    name: string;
    message: string;
    type: 'ALERT' | 'INFO';
    priority: number; // 1-10 (10 = Interruption Programme)
    capping: {
        maxViews: number; // 0 = illimité
        resetPeriod: 'session' | 'day' | 'never';
    };
    targeting: {
        locations: string[]; // ex: ['Paris', 'Libreville']
        interests?: Category[];
    };
    schedule: {
        startDate: string;
        endDate?: string;
        isActive: boolean;
    };
    createdAt: string;
    linkedArticleId?: string;
}

export type BroadcastType = 'ALERT' | 'INFO';

export interface ManualRankingEntry {
    id: string;
    userName: string;
    avatar: string;
    score: string;
    rawValue: number;
    categoryLabel: string;
    color: string;
}

export interface TickerConfig {
    mode: 'AUTO' | 'MANUAL' | 'HYBRID';
    speed: 'slow' | 'normal' | 'fast';
    defaultLocation: string;
    manualRankings: ManualRankingEntry[];
    rankingMode: 'AUTO' | 'MANUAL' | 'HYBRID';
    categoryTitles?: Record<string, string>;
}
