import { Component, Input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../services/translation.service';
import { FocusTrapDirective } from '../directives/focus-trap.directive';

type ReportCategory = 'truth' | 'ethics' | 'tech';
type ReportStep = 'selection' | 'description' | 'evidence' | 'review' | 'success';

@Component({
  selector: 'app-report-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective],
  template: `
    <div class="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden"
         role="dialog" aria-modal="true" aria-label="Signaler un contenu"
         appFocusTrap (escape)="onClose.emit()">
      <div class="p-6 flex items-center justify-between border-b border-white/10 bg-zinc-950">
        <div class="flex items-center gap-4">
          @if (step !== 'selection' && step !== 'success') {
            <button 
              (click)="handleBack()"
              class="p-3 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 text-white"
            >
              <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
            </button>
          }
          <div class="flex flex-col">
            <span class="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] leading-none mb-1">{{t()('RPT_TITLE')}}</span>
            <h2 class="text-lg font-black uppercase text-white tracking-tight">Dossier #{{ticketId}}</h2>
          </div>
        </div>
        <button (click)="onClose.emit()" class="p-3 bg-white/5 rounded-full text-white/70 hover:text-white">
          <lucide-icon name="x" class="w-6 h-6"></lucide-icon>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto bg-black p-6 pb-24">
        <div class="max-w-lg mx-auto">
          
          @if (step === 'selection') {
            <div>
              <h3 class="text-2xl font-black uppercase text-white mb-2 tracking-tighter">{{t()('RPT_SUBTITLE')}}</h3>
              <p class="text-white/60 text-sm mb-8">Sélectionnez le canal d'investigation approprié.</p>
              
              <div class="space-y-4">
                @for (cat of categoriesList; track cat.id) {
                  <button
                    (click)="category = cat.id; step = 'description'"
                    class="w-full bg-zinc-900 border-2 p-6 rounded-3xl flex items-center justify-between group active:scale-[0.98] text-left"
                    [ngClass]="cat.border"
                  >
                    <div class="flex items-center gap-5">
                      <div class="p-4 bg-black rounded-2xl border border-white/10" [ngClass]="cat.color">
                        <lucide-icon [name]="cat.icon" class="w-6 h-6"></lucide-icon>
                      </div>
                      <div>
                        <p class="text-white font-black uppercase text-sm tracking-tight">{{cat.title}}</p>
                        <p class="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1">{{cat.desc}}</p>
                      </div>
                    </div>
                    <lucide-icon name="arrow-right" class="w-5 h-5 text-white/20"></lucide-icon>
                  </button>
                }
              </div>
            </div>
          }

          @if (step === 'description') {
            <div>
              <h3 class="text-2xl font-black uppercase text-white mb-2 tracking-tighter">Votre Justification</h3>
              <p class="text-white/50 text-xs font-bold uppercase tracking-widest mb-8 leading-tight">
                Cible : <span class="text-white">"{{articleTitle}}"</span>
              </p>
              
              <div class="bg-zinc-900 rounded-3xl p-1 border border-white/10">
                <textarea
                  autofocus
                  [(ngModel)]="description"
                  [placeholder]="t()('RPT_DESC_PLACEHOLDER')"
                  class="w-full h-56 bg-transparent p-6 text-white text-lg outline-none placeholder:text-white/20 font-medium resize-none"
                ></textarea>
              </div>

              <div class="mt-4 flex items-center justify-between px-2">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" [ngClass]="isDescriptionValid() ? 'bg-emerald-500' : 'bg-amber-500'"></div>
                  <span class="text-[10px] font-black uppercase tracking-widest" [ngClass]="isDescriptionValid() ? 'text-emerald-500' : 'text-amber-500'">
                    {{ description.length < 30 ? 'Encore ' + (30 - description.length) + ' caractères' : 'Description validée' }}
                  </span>
                </div>
                <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">{{description.length}} / 1000</span>
              </div>

              <button 
                (click)="step = 'evidence'"
                [disabled]="!isDescriptionValid()"
                class="w-full mt-10 py-6 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-4"
                [ngClass]="isDescriptionValid() ? 'bg-white text-black active:scale-95' : 'bg-zinc-800 text-white/10 cursor-not-allowed'"
              >
                {{t()('RPT_BTN_NEXT')}} <lucide-icon name="arrow-right" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
          }

          @if (step === 'evidence') {
            <div>
              <h3 class="text-2xl font-black uppercase text-white mb-2 tracking-tighter">Dépôt de Preuves</h3>
              <p class="text-white/50 text-xs font-bold uppercase tracking-widest mb-10 leading-tight">
                Joignez au moins un lien ou un fichier pour soutenir votre audit.
              </p>
              
              <div class="space-y-10">
                <div class="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                   <div class="flex items-center gap-3 mb-4">
                      <lucide-icon name="link" class="w-4 h-4 text-sky-400"></lucide-icon>
                      <span class="text-[10px] font-black uppercase tracking-widest text-white">Liens Sources</span>
                   </div>
                   <div class="space-y-3">
                      @for (link of links; track $index) {
                        <input
                          [ngModel]="links[$index]"
                          (ngModelChange)="updateLink($index, $event)"
                          placeholder="https://source-officielle.com/..."
                          class="w-full bg-black border border-white/10 rounded-xl p-4 text-sm text-white focus:border-white/30 outline-none"
                        />
                      }
                      <button (click)="addLink()" class="text-[10px] font-black text-sky-400 uppercase tracking-widest hover:underline mt-2">+ Ajouter une autre URL</button>
                   </div>
                </div>

                <div class="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                   <div class="flex items-center gap-3 mb-4">
                      <lucide-icon name="paperclip" class="w-4 h-4 text-emerald-400"></lucide-icon>
                      <span class="text-[10px] font-black uppercase tracking-widest text-white">Médias & Captures</span>
                   </div>
                   <div class="grid grid-cols-2 gap-3">
                      <button (click)="simulateFileUpload()" class="bg-black border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-2 active:scale-95">
                         <lucide-icon name="image" class="w-5 h-5 text-white/40"></lucide-icon>
                         <span class="text-[9px] font-black uppercase text-white/40">Image</span>
                      </button>
                      <button (click)="simulateFileUpload()" class="bg-black border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-2 active:scale-95">
                         <lucide-icon name="mic" class="w-5 h-5 text-white/40"></lucide-icon>
                         <span class="text-[9px] font-black uppercase text-white/40">Audio</span>
                      </button>
                   </div>
                   
                   @if (attachedFiles.length > 0) {
                     <div class="mt-6 space-y-2">
                        @for (file of attachedFiles; track file) {
                          <div class="flex items-center justify-between bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-xl">
                             <div class="flex items-center gap-3">
                               <lucide-icon name="file-text" class="w-4 h-4 text-emerald-400"></lucide-icon>
                               <span class="text-[11px] font-bold text-white uppercase truncate max-w-[150px]">{{file}}</span>
                             </div>
                             <lucide-icon name="x" class="w-4 h-4 text-white/60 hover:text-white" (click)="removeFile(file)"></lucide-icon>
                          </div>
                        }
                     </div>
                   }
                </div>
              </div>

              @if (!hasEvidence()) {
                <div class="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                  <lucide-icon name="alert-circle" class="w-5 h-5 text-amber-500"></lucide-icon>
                  <p class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Une preuve est requise pour soumettre l'audit.</p>
                </div>
              }

              <button 
                (click)="step = 'review'"
                [disabled]="!hasEvidence()"
                class="w-full mt-10 py-6 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-4"
                [ngClass]="hasEvidence() ? 'bg-white text-black active:scale-95' : 'bg-zinc-800 text-white/10 cursor-not-allowed'"
              >
                Vérifier le Dossier <lucide-icon name="arrow-right" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
          }

          @if (step === 'review') {
            <div>
              <h3 class="text-2xl font-black uppercase text-white mb-8 tracking-tighter">Récapitulatif Final</h3>
              
              <div class="bg-zinc-900 border border-white/10 rounded-[32px] p-8 space-y-8">
                <div class="flex items-center justify-between pb-6 border-b border-white/10">
                   <div>
                     <span class="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">Investigation</span>
                     <p class="text-xl font-black uppercase" [ngClass]="currentCat()?.color">{{currentCat()?.title}}</p>
                   </div>
                   <div class="p-3 bg-black rounded-xl border border-white/10">
                     @if (currentCat()) {
                       <lucide-icon [name]="currentCat()!.icon" class="w-6 h-6" [ngClass]="currentCat()?.color"></lucide-icon>
                     }
                   </div>
                </div>

                <div>
                   <span class="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Votre Justification</span>
                   <p class="text-base text-white font-bold leading-relaxed uppercase tracking-tight line-clamp-4">"{{description}}"</p>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div class="bg-black p-4 rounded-2xl border border-white/5">
                    <span class="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">URLs Sources</span>
                    <p class="text-2xl font-black text-white">{{validLinksCount()}}</p>
                  </div>
                  <div class="bg-black p-4 rounded-2xl border border-white/5">
                    <span class="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Fichiers Médias</span>
                    <p class="text-2xl font-black text-white">{{attachedFiles.length}}</p>
                  </div>
                </div>
              </div>

              <div class="mt-10 p-6 bg-red-600/10 border border-red-600/30 rounded-[32px] flex gap-4">
                 <lucide-icon name="lock" class="w-6 h-6 text-red-600 shrink-0"></lucide-icon>
                 <p class="text-[11px] text-white/70 font-bold uppercase tracking-widest leading-relaxed">
                   En soumettant ce dossier, vous engagez votre crédibilité d'auditeur Cakenews. Un abus peut entraîner des sanctions.
                 </p>
              </div>

              <button 
                (click)="handleSubmit()"
                class="w-full mt-10 py-8 bg-red-600 text-white rounded-[32px] font-black uppercase text-lg tracking-[0.3em] flex items-center justify-center gap-5 active:scale-95"
              >
                {{t()('RPT_BTN_SUBMIT')}} <lucide-icon name="send" class="w-6 h-6"></lucide-icon>
              </button>
            </div>
          }

          @if (step === 'success') {
            <div class="flex-1 h-full flex flex-col items-center justify-center min-h-[60vh]">
              <div class="w-32 h-32 bg-white text-black rounded-full flex items-center justify-center mb-10 relative">
                <lucide-icon name="check-circle-2" class="w-16 h-16"></lucide-icon>
              </div>
              <h3 class="text-4xl font-black uppercase text-white mb-4 text-center tracking-tighter">DOSSIER REÇU</h3>
              <p class="text-white/50 text-[11px] font-black uppercase tracking-[0.4em] text-center max-w-[280px] leading-relaxed mb-10">
                Réf : {{ticketId}}<br/>
                Statut : Investigation Lancée
              </p>
              <div class="px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl flex items-center gap-3">
                 <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                 <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">En cours de traitement par l'équipe</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ReportPopupComponent {
  @Input() articleTitle = '';
  onClose = output<void>();
  onReportSubmitted = output<{ticketId: string, articleTitle: string}>();

  private translation = inject(TranslationService);
  t = this.translation.t;

  step: ReportStep = 'selection';
  category: ReportCategory | null = null;
  description = '';
  links: string[] = [''];
  attachedFiles: string[] = [];
  ticketId = `CKN-${(Math.random() * 100000).toFixed(0)}`;

  categoriesList = [
    {
      id: 'truth' as ReportCategory,
      title: this.t()('RPT_CAT_TRUTH'),
      subtitle: "Audit de Vérité",
      desc: "Erreur factuelle ou manipulation.",
      icon: 'alert-triangle',
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30"
    },
    {
      id: 'ethics' as ReportCategory,
      title: this.t()('RPT_CAT_ETHICS'),
      subtitle: "Audit de Comportement",
      desc: "Haine, harcèlement ou danger.",
      icon: 'shield-alert',
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30"
    },
    {
      id: 'tech' as ReportCategory,
      title: this.t()('RPT_CAT_TECH'),
      subtitle: "Audit d'Expérience",
      desc: "Bug d'affichage ou interface.",
      icon: 'zap',
      color: "text-sky-400",
      bg: "bg-sky-400/10",
      border: "border-sky-400/30"
    }
  ];

  currentCat() {
    return this.category ? this.categoriesList.find(c => c.id === this.category) : null;
  }

  isDescriptionValid() {
    return this.description.trim().length >= 30;
  }

  hasEvidence() {
    const validLinks = this.links.filter(l => l.trim().length > 8 && l.includes('.'));
    return validLinks.length > 0 || this.attachedFiles.length > 0;
  }

  validLinksCount() {
    return this.links.filter(l => l.trim().length > 0).length;
  }

  addLink() {
    this.links.push('');
  }

  updateLink(idx: number, val: string) {
    this.links[idx] = val;
  }

  simulateFileUpload() {
    const names = ['preuve_capture.png', 'audio_temoignage.mp3', 'doc_source.pdf'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    if (!this.attachedFiles.includes(randomName)) {
      this.attachedFiles.push(randomName);
    }
  }

  removeFile(file: string) {
    this.attachedFiles = this.attachedFiles.filter(f => f !== file);
  }

  handleBack() {
    if (this.step === 'description') this.step = 'selection';
    else if (this.step === 'evidence') this.step = 'description';
    else if (this.step === 'review') this.step = 'evidence';
  }

  handleSubmit() {
    this.step = 'success';
    this.onReportSubmitted.emit({ ticketId: this.ticketId, articleTitle: this.articleTitle });
    setTimeout(() => this.onClose.emit(), 2000);
  }
}
