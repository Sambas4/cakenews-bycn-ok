import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import {
  LUCIDE_ICONS, LucideIconProvider,
  Loader, Sparkles, History, MoreHorizontal, MoreVertical, Award, Leaf, X, Zap, Activity,
  ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Search, Languages, Twitter, Video,
  PlusSquare, FileEdit, AlignLeft, PenTool, PlaySquare, Calendar, CheckCircle, Megaphone,
  Ban, Home, MessageCircle, User, Settings, Share2, Heart, Bookmark, AlertTriangle,
  Shield, ShieldCheck, Eye, EyeOff, Flag, Radio, Monitor, ImageOff, Layers, Globe,
  BarChart3, SlidersHorizontal, Target, Flame, Lock, Mail, Key, Bell, Star, Info,
  LogOut, PieChart, Trophy, QrCode, MapPin, Check, Edit2, MessageSquare, CheckCircle2,
  Send, ArrowRight, Link, Image, FileText, Mic, MicOff, Paperclip, AlertCircle, Database,
  Save, Clock, Users, Plus, Trash2, Mic2, Play, Pause, Tag, RotateCcw, Download, RefreshCw,
  Filter, Sliders, ArrowUp, ArrowDown, ShieldAlert, ExternalLink, Cpu, Archive, Edit3,
  UserPlus, TrendingUp, Hash, BarChart2, List, AtSign, Smile, Camera, Headphones, Compass,
  Sparkle, MoonStar, Sun, ChevronUp, Bookmark as BookmarkIcon, Wifi, WifiOff
} from 'lucide-angular';

import { routes } from './app/app.routes';
import { GlobalErrorHandler } from './app/services/error-handler.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' })
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Loader, Sparkles, History, MoreHorizontal, MoreVertical, Award, Leaf, X, Zap, Activity,
        ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Search, Languages, Twitter, Video,
        PlusSquare, FileEdit, AlignLeft, PenTool, PlaySquare, Calendar, CheckCircle, Megaphone,
        Ban, Home, MessageCircle, User, Settings, Share2, Heart, Bookmark, AlertTriangle,
        Shield, ShieldCheck, Eye, EyeOff, Flag, Radio, Monitor, ImageOff, Layers, Globe,
        BarChart3, SlidersHorizontal, Target, Flame, Lock, Mail, Key, Bell, Star, Info,
        LogOut, PieChart, Trophy, QrCode, MapPin, Check, Edit2, MessageSquare, CheckCircle2,
        Send, ArrowRight, Link, Image, FileText, Mic, MicOff, Paperclip, AlertCircle, Database,
        Save, Clock, Users, Plus, Trash2, Mic2, Play, Pause, Tag, RotateCcw, Download, RefreshCw,
        Filter, Sliders, ArrowUp, ArrowDown, ShieldAlert, ExternalLink, Cpu, Archive, Edit3,
        UserPlus, TrendingUp, Hash, BarChart2, List, AtSign, Smile, Camera, Headphones, Compass,
        Sparkle, MoonStar, Sun, ChevronUp, BookmarkIcon, Wifi, WifiOff
      })
    }
  ]
}).catch(err => console.error(err));

// Register service worker (production only) — never block the main bootstrap.
if ('serviceWorker' in navigator && (import.meta as any)?.env?.MODE === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* swallow */ });
  });
}
