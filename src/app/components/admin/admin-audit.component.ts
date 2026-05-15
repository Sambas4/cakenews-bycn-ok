import { Component, Input, output, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ReportTicket, AuditLog } from '../../types';
import { SupabaseService } from '../../services/supabase.service';
import { Logger } from '../../services/logger.service';
import { RealtimeChannel } from '@supabase/supabase-js';

type AuditViewMode = 'truth' | 'ethics' | 'tech' | 'archives';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full flex bg-zinc-950 font-sans relative overflow-hidden">
      
      <div class="w-full md:w-96 border-r border-zinc-800 bg-zinc-925 flex-col shrink-0" [ngClass]="selectedReport() ? 'hidden md:flex' : 'flex'">
         
         <div class="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center gap-3">
            <lucide-icon name="shield-alert" class="w-5 h-5 text-white"></lucide-icon>
            <h2 class="text-sm font-black uppercase text-white tracking-widest">Audit Center</h2>
         </div>

         <div class="grid grid-cols-4 bg-zinc-950 border-b border-zinc-800">
             <button (click)="viewMode.set('truth')" class="flex flex-col items-center justify-center gap-1.5 py-4 border-b-2 transition-colors" [ngClass]="viewMode() === 'truth' ? 'border-amber-500 bg-amber-500/5' : 'border-transparent text-zinc-600 hover:bg-zinc-900'">
                 <lucide-icon name="file-text" class="w-4 h-4" [ngClass]="viewMode() === 'truth' ? 'text-amber-500' : 'text-zinc-500'"></lucide-icon>
                 <span class="text-[9px] font-black uppercase tracking-wider" [ngClass]="viewMode() === 'truth' ? 'text-white' : 'text-zinc-500'">Médias</span>
                 @if (getCount('truth') > 0) {
                    <span class="bg-amber-500 text-black text-[9px] font-bold px-1.5 rounded-full">{{getCount('truth')}}</span>
                 }
             </button>
             <button (click)="viewMode.set('ethics')" class="flex flex-col items-center justify-center gap-1.5 py-4 border-b-2 transition-colors" [ngClass]="viewMode() === 'ethics' ? 'border-red-500 bg-red-500/5' : 'border-transparent text-zinc-600 hover:bg-zinc-900'">
                 <lucide-icon name="users" class="w-4 h-4" [ngClass]="viewMode() === 'ethics' ? 'text-red-500' : 'text-zinc-500'"></lucide-icon>
                 <span class="text-[9px] font-black uppercase tracking-wider" [ngClass]="viewMode() === 'ethics' ? 'text-white' : 'text-zinc-500'">Social</span>
                 @if (getCount('ethics') > 0) {
                    <span class="bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">{{getCount('ethics')}}</span>
                 }
             </button>
             <button (click)="viewMode.set('tech')" class="flex flex-col items-center justify-center gap-1.5 py-4 border-b-2 transition-colors" [ngClass]="viewMode() === 'tech' ? 'border-sky-500 bg-sky-500/5' : 'border-transparent text-zinc-600 hover:bg-zinc-900'">
                 <lucide-icon name="cpu" class="w-4 h-4" [ngClass]="viewMode() === 'tech' ? 'text-sky-500' : 'text-zinc-500'"></lucide-icon>
                 <span class="text-[9px] font-black uppercase tracking-wider" [ngClass]="viewMode() === 'tech' ? 'text-white' : 'text-zinc-500'">Tech</span>
                 @if (getCount('tech') > 0) {
                    <span class="bg-sky-500 text-black text-[9px] font-bold px-1.5 rounded-full">{{getCount('tech')}}</span>
                 }
             </button>
             <button (click)="viewMode.set('archives')" class="flex flex-col items-center justify-center gap-1.5 py-4 border-b-2 transition-colors" [ngClass]="viewMode() === 'archives' ? 'border-white/50 bg-white/5' : 'border-transparent text-zinc-600 hover:bg-zinc-900'">
                 <lucide-icon name="archive" class="w-4 h-4" [ngClass]="viewMode() === 'archives' ? 'text-white' : 'text-zinc-500'"></lucide-icon>
                 <span class="text-[9px] font-black uppercase tracking-wider" [ngClass]="viewMode() === 'archives' ? 'text-white' : 'text-zinc-500'">Archive</span>
             </button>
         </div>

         <div class="p-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
             <div class="flex items-center gap-2">
                 <div class="w-1.5 h-1.5 rounded-full" [ngClass]="viewMode() === 'truth' ? 'bg-amber-500' : viewMode() === 'ethics' ? 'bg-red-500' : viewMode() === 'tech' ? 'bg-sky-500' : 'bg-white'"></div>
                 <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    @if (viewMode() === 'truth') { File Éditoriale }
                    @if (viewMode() === 'ethics') { Modération Communauté }
                    @if (viewMode() === 'tech') { Bugs & Support }
                    @if (viewMode() === 'archives') { Historique Global }
                 </span>
             </div>
             <lucide-icon name="search" class="w-3 h-3 text-zinc-600"></lucide-icon>
         </div>

         <div class="flex-1 overflow-y-auto">
            @for (report of filteredReports(); track report.id) {
                <div 
                  (click)="selectedReport.set(report)"
                  class="p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors group relative"
                  [ngClass]="selectedReport()?.id === report.id ? 'bg-zinc-800' : ''"
                >
                    @if (selectedReport()?.id === report.id) {
                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                    }
                    
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border" [ngClass]="
                            report.status === 'OPEN' ? 'bg-white text-black border-white' : 
                            report.status === 'IN_PROGRESS' ? 'bg-transparent text-white border-white/30' : 
                            'bg-transparent text-zinc-500 border-zinc-700'
                        ">
                            {{report.status === 'OPEN' ? 'À FAIRE' : report.status === 'IN_PROGRESS' ? 'EN COURS' : 'CLOS'}}
                        </span>
                        <span class="text-[9px] font-mono text-zinc-600">{{report.timestamp}}</span>
                    </div>
                    
                    <h3 class="text-sm font-bold text-white mb-1 truncate leading-tight group-hover:text-white transition-colors">
                        {{report.targetTitle || 'Contenu signalé'}}
                    </h3>
                    
                    <div class="flex items-center justify-between mt-3">
                        <div class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full bg-current" [ngClass]="getScoreColor(report.reporterScore)"></div>
                            <span class="text-[9px] text-zinc-500 uppercase font-bold tracking-wide">{{report.reporter}}</span>
                        </div>
                        @if (report.assignedTo) {
                            <div class="flex items-center gap-1 text-[8px] text-amber-500 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <lucide-icon name="lock" class="w-2 h-2"></lucide-icon> {{report.assignedTo.split(' ')[0]}}
                            </div>
                        }
                    </div>
                </div>
            }
            
            @if (filteredReports().length === 0) {
                <div class="flex flex-col items-center justify-center py-20 opacity-30">
                    <div class="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <lucide-icon name="check-circle" class="w-8 h-8 text-zinc-500"></lucide-icon>
                    </div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-center px-6">
                        Tout est propre.<br/>Aucun ticket dans le bureau {{viewMode()}}.
                    </p>
                </div>
            }
         </div>
      </div>

      <div class="flex-1 bg-black flex flex-col min-w-0" [ngClass]="!selectedReport() ? 'hidden md:flex' : 'fixed inset-0 z-30 md:static'">
         @if (selectedReport(); as report) {
             <div class="h-16 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-zinc-950 shrink-0">
                 <div class="flex items-center gap-4">
                     <button (click)="selectedReport.set(null)" class="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                         <lucide-icon name="arrow-left" class="w-5 h-5"></lucide-icon>
                     </button>
                     <div>
                         <h1 class="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                             #{{report.id.split('-')[1]}} 
                             <span class="text-[10px] px-2 py-0.5 rounded border hidden md:inline" [ngClass]="getPriorityColor(report.reason)">
                                 {{report.reason.toUpperCase()}}
                             </span>
                         </h1>
                     </div>
                 </div>
                 
                 @if (report.status === 'OPEN') {
                     <button 
                         (click)="handleAssign(report)"
                         class="bg-white text-black px-4 py-2 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
                     >
                         <lucide-icon name="lock" class="w-3 h-3"></lucide-icon> <span class="hidden md:inline">Prendre le dossier</span><span class="md:hidden">Prendre</span>
                     </button>
                 } @else {
                     <div class="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
                         <div class="w-2 h-2 rounded-full animate-pulse" [ngClass]="report.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                         <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[100px] md:max-w-none">
                             {{report.status === 'RESOLVED' ? 'CLÔTURÉ' : report.assignedTo}}
                         </span>
                     </div>
                 }
             </div>

             <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
                 <div class="w-full md:w-1/2 border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950 order-2 md:order-1 pb-32 md:pb-6">
                     <h3 class="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-6 flex items-center gap-2">
                         <lucide-icon name="alert-triangle" class="w-3 h-3"></lucide-icon> Accusation
                     </h3>
                     
                     <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
                         <div class="flex justify-between items-center mb-2">
                             <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Motif</span>
                             <div class="flex items-center gap-2">
                                 <lucide-icon name="user" class="w-3 h-3 text-zinc-600"></lucide-icon>
                                 <span class="text-[9px] font-bold text-zinc-400">{{report.reporter}}</span>
                                 <span class="text-[9px] px-1 rounded bg-white/5" [ngClass]="getScoreColor(report.reporterScore)">
                                     {{report.reporterScore}}%
                                 </span>
                             </div>
                         </div>
                         <p class="text-white font-medium text-sm leading-relaxed">"{{report.description}}"</p>
                     </div>

                     @if (report.evidenceLinks && report.evidenceLinks.length > 0) {
                         <div class="mb-6">
                             <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Preuves</span>
                             <div class="space-y-2">
                                 @for (link of report.evidenceLinks; track link) {
                                     <a [href]="link" target="_blank" rel="noreferrer" class="flex items-center gap-2 text-sky-500 hover:text-sky-400 text-xs font-mono truncate p-2 bg-zinc-900 rounded border border-zinc-800">
                                         <lucide-icon name="external-link" class="w-3 h-3 shrink-0"></lucide-icon> {{link}}
                                     </a>
                                 }
                             </div>
                         </div>
                     }

                     <div class="mt-8 pt-8 border-t border-zinc-800">
                         <h3 class="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-4 flex items-center gap-2">
                             <lucide-icon name="message-square" class="w-3 h-3"></lucide-icon> Notes d'équipe
                         </h3>
                         <div class="space-y-3 mb-4">
                             @for (note of report.internalNotes; track note.id) {
                                 <div class="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                     <div class="flex justify-between items-center mb-1">
                                         <span class="text-[9px] font-bold text-zinc-400 uppercase">{{note.adminName}}</span>
                                         <span class="text-[8px] font-mono text-zinc-600">{{note.timestamp}}</span>
                                     </div>
                                     <p class="text-xs text-white">{{note.action}}</p>
                                 </div>
                             }
                         </div>
                         <div class="flex gap-2">
                             <input 
                                 type="text" 
                                 [(ngModel)]="internalNote"
                                 placeholder="Note interne..."
                                 class="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                                 (keydown.enter)="handleAddNote()"
                             />
                             <button (click)="handleAddNote()" class="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white">
                                 <lucide-icon name="send" class="w-3 h-3"></lucide-icon>
                             </button>
                         </div>
                     </div>
                 </div>

                 <div class="w-full md:w-1/2 flex flex-col bg-black order-1 md:order-2 border-b md:border-b-0 border-zinc-800 h-[60vh] md:h-auto">
                     <div class="flex-1 p-6 overflow-y-auto">
                         <div class="flex items-center justify-between mb-6">
                             <h3 class="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                                 <lucide-icon name="eye" class="w-3 h-3"></lucide-icon> Contenu Incriminé
                             </h3>
                             
                             @if (report.targetType === 'ARTICLE' && report.status !== 'DISMISSED') {
                                 <button 
                                     (click)="onEditArticle.emit(report.targetId)"
                                     class="bg-[#ffcc00] text-black px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,204,0,0.3)] animate-pulse"
                                 >
                                     <lucide-icon name="edit-3" class="w-3 h-3"></lucide-icon> HOTFIX (Corriger)
                                 </button>
                             }
                         </div>
                         
                         <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
                             <div class="h-32 bg-zinc-800 flex items-center justify-center relative">
                                 <span class="text-zinc-600 text-xs font-black uppercase">Média / Image</span>
                             </div>
                             <div class="p-5">
                                 <h4 class="text-white font-bold mb-2">{{report.targetTitle}}</h4>
                                 <p class="text-zinc-400 text-xs leading-relaxed">{{report.targetContentPreview}}</p>
                             </div>
                         </div>

                         @if (report.status !== 'RESOLVED' && report.status !== 'DISMISSED') {
                             <div>
                                 <h3 class="text-[10px] font-black uppercase text-white tracking-[0.2em] mb-4 flex items-center gap-2">
                                     <lucide-icon name="zap" class="w-3 h-3 text-yellow-500"></lucide-icon> Verdict Rapide
                                 </h3>
                                 
                                 <div class="grid grid-cols-2 gap-3 mb-6">
                                     <button 
                                         (click)="handleVerdict('VALID')"
                                         class="p-4 bg-red-900/20 border border-red-500/30 hover:bg-red-900/40 rounded-xl text-left transition-all group active:scale-95"
                                     >
                                         <span class="text-red-500 font-black uppercase text-xs tracking-widest block mb-1">Sanctionner</span>
                                         <span class="text-red-300/60 text-[10px]">Le signalement est valide. Supprimer le contenu.</span>
                                     </button>
                                     <button 
                                         (click)="handleVerdict('INVALID')"
                                         class="p-4 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-xl text-left transition-all group active:scale-95"
                                     >
                                         <span class="text-white font-black uppercase text-xs tracking-widest block mb-1">Rejeter</span>
                                         <span class="text-zinc-500 text-[10px]">Faux positif. Le contenu reste en ligne.</span>
                                     </button>
                                 </div>

                                 <div>
                                     <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Réponses pré-enregistrées</span>
                                     <div class="flex flex-wrap gap-2">
                                         <button 
                                             (click)="handleVerdict('VALID', 'Merci. Votre vigilance aide à garder CakeNews propre. Contenu supprimé.')"
                                             class="px-3 py-2 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors bg-zinc-950"
                                         >
                                             "Merci, contenu supprimé"
                                         </button>
                                         <button 
                                             (click)="handleVerdict('INVALID', 'Après analyse humaine, ce contenu ne viole pas nos règles. Merci quand même.')"
                                             class="px-3 py-2 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors bg-zinc-950"
                                         >
                                             "Conforme aux règles"
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         }
                         
                         @if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
                             <div class="p-6 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
                                 <lucide-icon name="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-3"></lucide-icon>
                                 <p class="text-xs font-bold text-white uppercase tracking-widest">Dossier Clôturé</p>
                             </div>
                         }
                     </div>
                 </div>
             </div>
         } @else {
             <div class="flex-1 flex flex-col items-center justify-center text-zinc-700 bg-zinc-950">
                 <div class="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                    <lucide-icon name="shield-alert" class="w-8 h-8 opacity-20"></lucide-icon>
                 </div>
                 <p class="text-sm font-mono uppercase tracking-widest text-center px-4">
                     Sélectionnez un ticket pour l'audit<br/>
                     <span class="text-[10px] opacity-50 block mt-2">Utilisez les onglets pour filtrer la file</span>
                 </p>
             </div>
         }
      </div>
    </div>
  `
})
export class AdminAuditComponent implements OnInit, OnDestroy {
  sendNotification = output<{target: string, content: string}>();
  onEditArticle = output<string>();

  reports = signal<ReportTicket[]>([]);
  selectedReport = signal<ReportTicket | null>(null);
  viewMode = signal<AuditViewMode>('truth');
  internalNote = '';
  
  private channelReports: RealtimeChannel | null = null;
  private supabaseService = inject(SupabaseService);
  private logger = inject(Logger);

  async ngOnInit() {
      try {
          const { data, error } = await this.supabaseService.client.from('reports').select('*');
          if (!error && data) {
              this.setReports(data as ReportTicket[]);
          }
      } catch (e) {
          this.logger.warn('admin.reports.fetch', e);
      }

      this.channelReports = this.supabaseService.client.channel('public:reports')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, async () => {
              const { data } = await this.supabaseService.client.from('reports').select('*');
              if (data) this.setReports(data as ReportTicket[]);
          })
          .subscribe();
  }

  ngOnDestroy() {
      if (this.channelReports) {
          this.supabaseService.client.removeChannel(this.channelReports);
      }
  }

  private setReports(fetchedReports: ReportTicket[]) {
      this.reports.set(fetchedReports);
      if (this.selectedReport()) {
          const currentId = this.selectedReport()!.id;
          const updatedReport = fetchedReports.find(r => r.id === currentId);
          if (updatedReport) {
              this.selectedReport.set(updatedReport);
          } else {
              this.selectedReport.set(null);
          }
      }
  }

  filteredReports = computed(() => {
      const mode = this.viewMode();
      return this.reports().filter(r => {
          if (mode === 'archives') {
              return r.status === 'RESOLVED' || r.status === 'DISMISSED';
          }
          return r.reason === mode && (r.status === 'OPEN' || r.status === 'IN_PROGRESS');
      });
  });

  getCount(mode: AuditViewMode) {
      if (mode === 'archives') return this.reports().filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED').length;
      return this.reports().filter(r => r.reason === mode && (r.status === 'OPEN' || r.status === 'IN_PROGRESS')).length;
  }

  getPriorityColor(reason: string) {
    switch (reason) {
      case 'ethics': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'truth': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'tech': return 'text-sky-500 bg-sky-500/10 border-sky-500/30';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  }

  getScoreColor(score: number) {
      if (score >= 80) return 'text-emerald-500';
      if (score >= 50) return 'text-amber-500';
      return 'text-red-500';
  }

  async handleAssign(report: ReportTicket) {
      try {
          await this.supabaseService.client.from('reports').update({
              status: 'IN_PROGRESS',
              assignedTo: 'Moi (Admin)'
          }).eq('id', report.id);
      } catch (error) {
          this.logger.error('admin.report.assign', error);
      }
  }

  async handleAddNote() {
      const report = this.selectedReport();
      if (!report || !this.internalNote.trim()) return;
      
      const newNote: AuditLog = {
          id: Date.now().toString(),
          adminName: 'Moi',
          action: this.internalNote,
          timestamp: new Date().toLocaleTimeString()
      };
      
      try {
          await this.supabaseService.client.from('reports').update({
              internalNotes: [...(report.internalNotes || []), newNote]
          }).eq('id', report.id);
          this.internalNote = '';
      } catch (error) {
          this.logger.error('admin.report.note', error);
      }
  }

  async handleVerdict(verdict: 'VALID' | 'INVALID' | 'WARN', customMsg?: string) {
      const report = this.selectedReport();
      if (!report) return;

      let notifMsg = "";
      let newStatus: 'RESOLVED' | 'DISMISSED' = 'RESOLVED';

      switch (verdict) {
          case 'VALID':
              notifMsg = customMsg || `Verdict : Votre signalement "${report.targetTitle}" a été validé. Le contenu a été supprimé. Merci pour votre vigilance.`;
              newStatus = 'RESOLVED';
              break;
          case 'INVALID':
              notifMsg = customMsg || `Verdict : Après analyse, le contenu "${report.targetTitle}" respecte nos standards. Signalement classé.`;
              newStatus = 'DISMISSED';
              break;
          case 'WARN':
              notifMsg = customMsg || `Verdict : Contenu maintenu mais sous surveillance grâce à vous.`;
              newStatus = 'RESOLVED';
              break;
      }

      this.sendNotification.emit({ target: report.reporter, content: notifMsg });

      try {
          await this.supabaseService.client.from('reports').update({
              status: newStatus
          }).eq('id', report.id);
      } catch (error) {
          this.logger.error('admin.report.verdict', error);
      }
  }

  handleBack(): boolean {
      if (this.selectedReport()) {
          this.selectedReport.set(null);
          return true;
      }
      return false;
  }
}
