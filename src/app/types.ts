
/**
 * Macro-buckets used for routing, theming and the algorithm's adjacency
 * graph. Granularity (clubs, teams, brands) lives in {@link Tag} —
 * categories must stay coarse enough to make sense as algorithmic
 * neighbourhoods. "Real Madrid" is a tag of "Football", not a peer.
 */
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
  // CLUBS & ÉQUIPES — KEPT TEMPORARILY for backward compatibility while
  // the migration to {@link Tag} rolls out. New articles MUST set the
  // parent category (e.g. 'Football') and put the team in `tags`.
  /** @deprecated use Tag */ 'Real Madrid' |
  /** @deprecated use Tag */ 'FC Barcelone' |
  /** @deprecated use Tag */ 'PSG' |
  /** @deprecated use Tag */ 'OM' |
  /** @deprecated use Tag */ 'Lakers' |
  /** @deprecated use Tag */ 'Ferrari' |
  // ZONE ROUGE & EXPLICITE (Sans filtre)
  'Guerre' | 'Faits Divers' | 'Paranormal' | 'Opinion Choc' |
  // ADULTE / NON CENSURÉ — gated by user opt-in in the settings.
  'Mature' | 'Nudité' | 'Charme';

/**
 * Free-form, content-level descriptor. Multiple tags per article. Tags
 * are searchable, browsable and feed the recommender's "novelty" axis,
 * but they never partition the database. Use them for teams, brands,
 * named entities, sub-topics, recurring series, etc.
 */
export type Tag = string;

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
  
  /**
   * Free-form descriptors (clubs, brands, recurring series). Surface
   * these in search, filters, and the algorithm's novelty axis. Tags
   * never replace `category` — they enrich it.
   */
  tags?: Tag[];

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
  /** Avatar URL alias used across UI components (mirrors photoURL). */
  avatarUrl?: string;
  /** Background colour set during onboarding. */
  avatarBg?: string;
  bio?: string;
  username?: string;
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  /** Convenience flag derived from role for the UI. */
  isAdmin?: boolean;
  moderationNote?: string;

  // Optional preferences (premium profile)
  preferences?: {
    notifications?: {
      directMessages?: boolean;
      replies?: boolean;
      breakingNews?: boolean;
      digest?: 'never' | 'daily' | 'weekly';
    };
    privacy?: {
      showActivity?: boolean;
      showLocation?: boolean;
      allowDirectMessages?: 'everyone' | 'verified' | 'none';
    };
    accessibility?: {
      reduceMotion?: boolean;
      largerText?: boolean;
    };
  };
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  avatarBg?: string;
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
