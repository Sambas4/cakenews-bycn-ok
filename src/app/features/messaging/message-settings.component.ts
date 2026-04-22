import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-message-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <header class="flex-none flex items-center px-2 h-[60px] bg-black border-b border-white/5 z-20">
      <button (click)="back.emit()" class="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-white/5 mr-1">
        <lucide-icon name="chevron-left" class="w-7 h-7"></lucide-icon>
      </button>
      <h1 class="text-[18px] font-bold tracking-tight text-white">Paramètres Messagerie</h1>
    </header>

    <div class="flex-1 overflow-y-auto bg-[#0a0a0c] pt-2 custom-scrollbar">
      
      <!-- Securité & Chiffrement -->
      <div class="mb-6">
        <h2 class="px-5 py-2 text-[12px] font-bold text-emerald-500 uppercase tracking-widest">Confidentialité & Chiffrement</h2>
        <div class="bg-black border-y border-white/5">
          <div class="flex items-center justify-between px-5 h-[56px] border-b border-white/5">
            <div class="flex items-center gap-3">
              <lucide-icon name="lock" class="w-5 h-5 text-zinc-400"></lucide-icon>
              <span class="text-[15px] font-medium text-zinc-100">Clés de chiffrement de bout en bout</span>
            </div>
            <button class="px-3 py-1 bg-zinc-800 rounded text-[12px] font-bold text-white hover:bg-zinc-700 transition-colors">Vérifier</button>
          </div>
          <div class="flex items-center justify-between px-5 h-[56px] border-b border-white/5 cursor-pointer hover:bg-white/[0.02]">
            <div class="flex items-center gap-3">
              <lucide-icon name="shield" class="w-5 h-5 text-zinc-400"></lucide-icon>
              <span class="text-[15px] font-medium text-zinc-100">Mots de passe & Biométrie</span>
            </div>
            <lucide-icon name="chevron-right" class="w-5 h-5 text-zinc-600"></lucide-icon>
          </div>
          <div class="flex items-center justify-between px-5 h-[56px] cursor-pointer hover:bg-white/[0.02]">
            <div class="flex items-center gap-3">
              <lucide-icon name="monitor" class="w-5 h-5 text-zinc-400"></lucide-icon>
              <span class="text-[15px] font-medium text-zinc-100">Appareils connectés</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[13px] text-zinc-500 font-medium">1 Actif</span>
              <lucide-icon name="chevron-right" class="w-5 h-5 text-zinc-600"></lucide-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Alertes Intelligentes -->
      <div class="mb-6">
        <h2 class="px-5 py-2 text-[12px] font-bold text-blue-500 uppercase tracking-widest">Alertes Intelligentes & Débats</h2>
        <div class="bg-black border-y border-white/5">
          <div class="flex items-center justify-between px-5 h-[56px] border-b border-white/5">
            <div class="flex flex-col justify-center">
              <span class="text-[15px] font-medium text-zinc-100">Réponses à mes commentaires</span>
              <span class="text-[11px] text-zinc-500">M'alerter instantanément</span>
            </div>
            <div class="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end p-1 relative cursor-pointer">
              <div class="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>
          <div class="flex items-center justify-between px-5 py-3 min-h-[56px] border-b border-white/5">
            <div class="flex flex-col justify-center max-w-[75%]">
              <span class="text-[15px] font-medium text-zinc-100">Traction d'un grand débatteur</span>
              <span class="text-[11px] text-zinc-500 leading-tight mt-0.5">M'alerter si un utilisateur participant au même débat que moi suscite massivement des réactions.</span>
            </div>
            <div class="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end p-1 relative cursor-pointer">
               <div class="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Données -->
      <div class="mb-10">
        <h2 class="px-5 py-2 text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Gestion du compte</h2>
        <div class="bg-black border-y border-white/5">
          <div class="flex items-center gap-3 px-5 h-[56px] border-b border-white/5 text-red-500 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors">
            <lucide-icon name="trash-2" class="w-5 h-5"></lucide-icon>
            <span class="text-[15px] font-medium">Archiver tous les débats</span>
          </div>
        </div>
      </div>
      
    </div>
  `
})
export class MessageSettingsComponent {
  back = output<void>();
}
