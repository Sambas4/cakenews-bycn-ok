import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider, MoreHorizontal, X, Zap, Activity, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Search, Languages, Twitter, Video, PlusSquare, FileEdit, AlignLeft, PenTool, PlaySquare, Calendar, CheckCircle, Megaphone, Ban, Home, MessageCircle, User, Settings, Share2, Heart, Bookmark, AlertTriangle, Shield, ShieldCheck, Eye, EyeOff, Flag, Radio, Monitor, ImageOff, Layers, Globe, BarChart3, SlidersHorizontal, Target, Flame, Lock, Mail, Key, Bell, Star, Info, LogOut, PieChart, Trophy, QrCode, MapPin, Check, Edit2, MessageSquare, CheckCircle2, Send, ArrowRight, Link, Image, FileText, Mic, MicOff, Paperclip, AlertCircle, Database, Save, Clock, Users, Plus, Trash2, Mic2, Play, Pause, Tag, RotateCcw, Download, RefreshCw, Filter, Sliders, ArrowUp, ArrowDown, ShieldAlert, ExternalLink, Cpu, Archive, Edit3, UserPlus, TrendingUp, Hash, BarChart2, List, AtSign } from 'lucide-angular';

import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ MoreHorizontal, X, Zap, Activity, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Search, Languages, Twitter, Video, PlusSquare, FileEdit, AlignLeft, PenTool, PlaySquare, Calendar, CheckCircle, Megaphone, Ban, Home, MessageCircle, User, Settings, Share2, Heart, Bookmark, AlertTriangle, Shield, ShieldCheck, Eye, EyeOff, Flag, Radio, Monitor, ImageOff, Layers, Globe, BarChart3, SlidersHorizontal, Target, Flame, Lock, Mail, Key, Bell, Star, Info, LogOut, PieChart, Trophy, QrCode, MapPin, Check, Edit2, MessageSquare, CheckCircle2, Send, ArrowRight, Link, Image, FileText, Mic, MicOff, Paperclip, AlertCircle, Database, Save, Clock, Users, Plus, Trash2, Mic2, Play, Pause, Tag, RotateCcw, Download, RefreshCw, Filter, Sliders, ArrowUp, ArrowDown, ShieldAlert, ExternalLink, Cpu, Archive, Edit3, UserPlus, TrendingUp, Hash, BarChart2, List, AtSign }) }
  ]
}).catch(err => console.error(err));

