import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../services/interaction.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

type ProfileTab = 'activity' | 'settings';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="w-full h-full bg-black flex flex-col text-white relative hide-scrollbar overflow-hidden">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between p-6 bg-black z-10 sticky top-0 border-b border-zinc-900 flex-shrink-0">
        <button (click)="goBack()" class="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer active:scale-95">
          <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
        </button>
        <h1 class="text-xs font-[1000] tracking-[0.2em] uppercase text-zinc-500">Mon Espace</h1>
        <div class="w-10 h-10"></div> <!-- spacer -->
      </div>

      <!-- COMPACT USER BAR -->
      <div class="px-6 flex items-center justify-between gap-4 py-6 border-b border-zinc-900/50 flex-shrink-0">
         <div class="flex items-center gap-4">
           <div class="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0" [ngStyle]="{'background-color': userService.currentUserProfile()?.avatarBg || '#000'}">
              <img [src]="userService.currentUserProfile()?.avatarUrl" class="w-[120%] h-[120%] object-contain" />
           </div>
           <div class="flex flex-col">
              <h2 class="text-xl font-[1000] text-white tracking-tight leading-tight">{{ userService.currentUserProfile()?.username || 'Utilisateur' }}</h2>
              <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                <lucide-icon name="activity" class="w-3 h-3 text-[#7ae25c]"></lucide-icon>
                {{ readArticles().length }} articles explorés
              </div>
           </div>
         </div>
         @if(userService.currentUserProfile()?.isAdmin) {
             <button (click)="goToAdmin()" class="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-500/30 transition-colors">
               <lucide-icon name="shield-alert" class="w-4 h-4"></lucide-icon>
             </button>
         }
      </div>

      <!-- TABS -->
      <div class="px-6 py-4 flex-shrink-0">
        <div class="flex bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
          <button (click)="activeTab.set('activity')" [ngClass]="activeTab() === 'activity' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500'" class="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
            Activité & Biblio
          </button>
          <button (click)="activeTab.set('settings')" [ngClass]="activeTab() === 'settings' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500'" class="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
            Paramètres
          </button>
        </div>
      </div>

      <!-- SCROLLABLE CONTENT (Takes remaining space) -->
      <div class="flex-1 overflow-y-auto px-6 pb-20 relative hide-scrollbar">
        
        <!-- === ACTIVITY TAB === -->
        @if (activeTab() === 'activity') {
          <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <!-- DNA / RÉSUMÉ -->
            <div class="bg-zinc-900/40 rounded-[20px] p-5 border border-zinc-800 flex flex-col items-start relative overflow-hidden">
               <div class="absolute -top-10 -right-10 w-32 h-32 bg-[#7ae25c]/10 blur-3xl rounded-full"></div>
               <h3 class="text-[10px] font-black uppercase tracking-widest text-[#7ae25c] mb-3 flex items-center gap-2 relative z-10">
                  <lucide-icon name="pie-chart" class="w-4 h-4"></lucide-icon> Ton ADN Lecteur
               </h3>
               <p class="text-sm font-bold text-white leading-relaxed relative z-10">
                  Tu consommes <span class="text-[#7ae25c]">{{ adnStats().topCatPercent }}% {{ adnStats().topCat }}</span>,
                  {{ adnStats().secondCatPercent }}% {{ adnStats().secondCat }} et {{ adnStats().thirdCatPercent }}% {{ adnStats().thirdCat }}.
               </p>
               <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-4 pt-4 border-t border-zinc-800/50 w-full relative z-10">
                  <lucide-icon name="clock" class="w-3 h-3 inline mr-1"></lucide-icon> Tu lis surtout des formats {{ adnStats().formatPref }}.
               </p>
            </div>

            <!-- LIBRARY -->
            <div>
               <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Historique & Sauvegardes</h3>
               
               <div class="flex flex-col gap-2">
                  <button class="w-full bg-zinc-900/40 border border-zinc-800 rounded-[20px] p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors group">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-[#38bdf8]/10 flex items-center justify-center">
                         <lucide-icon name="bookmark" class="w-3 h-3 text-[#38bdf8] fill-[#38bdf8]/20"></lucide-icon>
                      </div>
                      <span class="text-xs font-[1000] uppercase tracking-wider text-white">Articles Sauvegardés</span>
                    </div>
                    <span class="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">{{savedArticles().length}}</span>
                  </button>

                  <button class="w-full bg-zinc-900/40 border border-zinc-800 rounded-[20px] p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors group">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                         <lucide-icon name="history" class="w-3 h-3 text-white/50 group-hover:text-white transition-colors"></lucide-icon>
                      </div>
                      <span class="text-xs font-[1000] uppercase tracking-wider text-white">Historique Récent</span>
                    </div>
                    <lucide-icon name="chevron-right" class="w-4 h-4 text-zinc-600"></lucide-icon>
                  </button>
                  
                  <button class="w-full bg-[#7ae25c]/10 border border-[#7ae25c]/20 rounded-[20px] p-4 flex items-center justify-between hover:bg-[#7ae25c]/20 transition-colors mt-2 group relative overflow-hidden">
                    <div class="flex items-center gap-3 relative z-10">
                      <div class="w-8 h-8 rounded-full bg-[#7ae25c] flex items-center justify-center">
                         <lucide-icon name="sparkles" class="w-4 h-4 text-black"></lucide-icon>
                      </div>
                      <div class="flex flex-col items-start gap-1">
                        <span class="text-xs font-[1000] uppercase tracking-wider text-[#7ae25c]">Tu as manqué ça aujourd'hui</span>
                        <span class="text-[9px] font-black uppercase tracking-[0.1em] text-[#7ae25c]/60 group-hover:text-[#7ae25c] transition-colors">👉 Continuer la lecture</span>
                      </div>
                    </div>
                  </button>
               </div>
            </div>
          </div>
        }

        <!-- === SETTINGS TAB === -->
        @if (activeTab() === 'settings') {
          <!-- Important: h-full so that the flex container stretches entirely, pushing danger zone to the bottom -->
          <div class="min-h-full flex flex-col justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div class="space-y-2">
               <h3 class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Configuration</h3>
               
               <div class="bg-zinc-900/40 border border-zinc-800 rounded-[20px] overflow-hidden flex flex-col">
                  <div class="flex items-center justify-between p-5 border-b border-zinc-800">
                     <div class="flex items-center gap-3">
                        <lucide-icon name="languages" class="w-4 h-4 text-zinc-400"></lucide-icon>
                        <span class="text-xs font-[1000] uppercase tracking-wider text-white">Langue</span>
                     </div>
                     <span class="text-[9px] font-black uppercase tracking-widest text-[#7ae25c] bg-[#7ae25c]/10 px-2 py-1 rounded">Français</span>
                  </div>
                  
                  <div class="flex items-center justify-between p-5">
                     <div class="flex items-center gap-3">
                        <lucide-icon name="monitor" class="w-4 h-4 text-zinc-400"></lucide-icon>
                        <span class="text-xs font-[1000] uppercase tracking-wider text-white">Mode Sombre</span>
                     </div>
                     <div class="w-8 h-4 bg-[#7ae25c] rounded-full relative opacity-50 cursor-not-allowed">
                        <div class="absolute right-0.5 top-0.5 w-3 h-3 bg-black rounded-full"></div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- DANGER ZONE (Pushed to bottom) -->
            <div class="pt-8 flex flex-col gap-2 pb-6 mt-12 mb-safe">
               <button (click)="logout()" class="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-[1000] uppercase tracking-widest text-[10px] py-4 rounded-[16px] flex items-center justify-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors">
                  <lucide-icon name="log-out" class="w-3 h-3"></lucide-icon> Se déconnecter
               </button>

               <button (click)="deleteAccount()" class="w-full bg-zinc-950 border border-red-900/30 text-red-500/50 font-black uppercase tracking-widest text-[10px] py-4 rounded-[16px] flex items-center justify-center gap-2 hover:bg-black/40 hover:text-red-500 hover:border-red-500/50 transition-colors">
                  <lucide-icon name="trash-2" class="w-3 h-3"></lucide-icon> Supprimer mon compte
               </button>
               
               <p class="text-center mt-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                Action irréversible. Toutes vos données seront effacées.
               </p>
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class ProfileViewComponent implements OnInit {
  private interaction = inject(InteractionService);
  private location = inject(Location);
  public authService = inject(AuthService);
  public userService = inject(UserService);
  private router = inject(Router);

  readArticles = this.interaction.readArticles;
  savedArticles = this.interaction.savedArticles;
  sessionHistory = this.interaction.sessionHistory;

  activeTab = signal<ProfileTab>('activity');

  adnStats = computed(() => {
    const history = this.sessionHistory();
    if (history.length === 0) {
      return { topCat: 'Tech', topCatPercent: 70, secondCat: 'Business', secondCatPercent: 20, thirdCat: 'Sport', thirdCatPercent: 10, formatPref: 'courts' };
    }

    const categoryCount: Record<string, number> = {};
    let totalDuration = 0;
    
    history.forEach(session => {
       const cat = session.category.toLowerCase().trim();
       categoryCount[cat] = (categoryCount[cat] || 0) + 1;
       totalDuration += session.durationMs;
    });

    const totalArticles = history.length;
    const sortedCats = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    
    const topCat = sortedCats[0]?.[0] || 'tech';
    const topPercent = Math.round(((sortedCats[0]?.[1] || 0) / totalArticles) * 100);
    
    const secondCat = sortedCats[1]?.[0] || 'business';
    const secondPercent = Math.round(((sortedCats[1]?.[1] || 0) / totalArticles) * 100);
    
    const thirdCat = sortedCats[2]?.[0] || 'sport';
    const thirdPercent = Math.round(((sortedCats[2]?.[1] || 0) / totalArticles) * 100);

    const avgDuration = totalDuration / totalArticles;
    const formatPref = avgDuration > 120000 ? 'longs et détaillés' : 'courts et rapides';

    return {
      topCat, topCatPercent: topPercent || 70,
      secondCat, secondCatPercent: secondPercent || 20,
      thirdCat, thirdCatPercent: thirdPercent || 10,
      formatPref
    };
  });

  ngOnInit() {
  }

  goBack() {
    this.router.navigate(['/feed']);
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  async logout() {
    if (confirm("Se déconnecter de votre compte ?")) {
      await this.authService.logout();
      this.router.navigate(['/auth']);
    }
  }

  async deleteAccount() {
    if (confirm("⚠️ ACTION IRRÉVERSIBLE.\nÊtes-vous sûr de vouloir supprimer définitivement votre compte et tout votre historique ?")) {
      try {
         await this.authService.deleteAccount();
         this.router.navigate(['/auth']);
      } catch (err: any) {
         if (err.message && err.message.includes('requires-recent-login')) {
            alert("Pour des raisons de sécurité, veuillez vous déconnecter, vous reconnecter, puis réessayer de supprimer votre compte.");
         } else {
            alert("Une erreur s'est produite lors de la suppression du compte.");
         }
      }
    }
  }
}

