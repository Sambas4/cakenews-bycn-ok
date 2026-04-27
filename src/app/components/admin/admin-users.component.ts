import { Component, signal, computed, output, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { LucideAngularModule } from "lucide-angular";
import { UserProfile } from "../../types";
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import { Router } from "@angular/router";
import { SupabaseService } from "../../services/supabase.service";

@Component({
  selector: "app-admin-users",
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-950 font-sans relative">
      <!-- HEADER RECHERCHE -->
      <div class="p-4 border-b border-zinc-800 bg-black">
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50 text-zinc-500">
          <lucide-icon name="filter" class="w-4 h-4"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">RECHERCHE & FILTRES</h3>
        </div>

        <div class="relative">
          <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"></lucide-icon>
          <input type="text" placeholder="Rechercher un utilisateur..." [(ngModel)]="searchTerm" class="w-full bg-zinc-900 border border-zinc-800 py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors rounded-none" />
        </div>

        <div class="flex justify-between mt-4">
          <div class="flex gap-2">
            @for (f of filters; track f) {
              <button (click)="filter.set(f)" class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border" [ngClass]="filter() === f ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'">{{ f }}</button>
            }
          </div>
          <button (click)="handleOpenMessage(null)" class="px-4 py-1.5 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest border border-zinc-700 hover:bg-zinc-700 flex items-center gap-2">
            <lucide-icon name="megaphone" class="w-3 h-3"></lucide-icon>
            Broadcast
          </button>
        </div>
      </div>

      <!-- LISTE UTILISATEURS -->
      <div class="flex-1 overflow-y-auto pb-20 p-4">
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50 text-zinc-500">
          <lucide-icon name="list" class="w-4 h-4"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">BASE UTILISATEURS (EN DIRECT)</h3>
        </div>

        @if (isLoading()) {
          <div class="py-12 flex justify-center text-zinc-600">
             <lucide-icon name="loader" class="w-8 h-8 animate-spin"></lucide-icon>
          </div>
        } @else {
          <div class="divide-y divide-zinc-900">
            @for (user of filteredUsers(); track user.uid) {
              <div (click)="openUserDetail(user)" class="py-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-zinc-900/50 transition-colors group px-2 rounded-lg cursor-pointer">
                <div class="flex items-center gap-4 w-full md:w-1/2">
                  <div class="relative">
                    <img [src]="user.photoURL || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + user.displayName" referrerpolicy="no-referrer" class="w-12 h-12 rounded-full object-cover border-2" [ngClass]="user.status === 'BANNED' ? 'border-red-600 grayscale' : 'border-zinc-800'" alt="" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-white truncate">{{ user.displayName }}</span>
                    </div>
                    <span class="text-xs text-zinc-500 truncate block">{{ '@' }}{{ user.username }}</span>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" [ngClass]="{'bg-emerald-500/20 text-emerald-500': user.status === 'ACTIVE' || !user.status, 'bg-red-500/20 text-red-500': user.status === 'BANNED' || user.status === 'SUSPENDED'}">{{ user.status || 'ACTIVE' }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between md:justify-end gap-4 mt-4 md:mt-0 w-full md:w-1/2 px-4 md:px-0 border-t border-zinc-800/50 md:border-none pt-4 md:pt-0">
                  <div class="flex flex-col text-right">
                    <span class="text-[9px] text-zinc-500 uppercase tracking-widest">Inscrit le</span>
                    <span class="text-xs font-mono text-zinc-300">{{ user.joinDate || 'N/A' }}</span>
                  </div>
                  <lucide-icon name="chevron-right" class="w-5 h-5 text-zinc-700 group-hover:text-white transition-colors"></lucide-icon>
                </div>
              </div>
            }

            @if (filteredUsers().length === 0) {
              <div class="py-20 flex flex-col items-center text-zinc-600">
                <lucide-icon name="shield" class="w-12 h-12 mb-4 opacity-20"></lucide-icon>
                <p class="text-xs font-mono uppercase">Aucun utilisateur trouvé</p>
              </div>
            }
          </div>
        }
      </div>

      <!-- OVERLAY USER DETAILS -->
      @if (detailedUser()) {
        <div class="absolute inset-0 bg-black/95 z-[60] flex flex-col p-6 overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
           <button (click)="closeUserDetail()" class="self-start text-zinc-500 hover:text-white mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
               <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon> Retour
           </button>
           
           <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center mb-6">
               <div class="relative mb-4">
                  <img [src]="detailedUser()?.photoURL || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + detailedUser()?.displayName" class="w-24 h-24 rounded-full object-cover border-4 border-zinc-800" [ngClass]="{'border-red-600 grayscale': detailedUser()?.status === 'BANNED'}" />
               </div>

               <h2 class="text-2xl font-[1000] text-white tracking-tighter text-center">{{ detailedUser()?.displayName }}</h2>
               <p class="text-sm font-bold text-zinc-500 mb-1 text-center">{{ '@' }}{{ detailedUser()?.username }}</p>
               <p class="text-xs text-zinc-600 font-mono mb-4 text-center">{{ detailedUser()?.email || 'Pas email' }}</p>

               <div class="flex gap-2">
                  <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full" [ngClass]="{'bg-emerald-500/20 text-emerald-500': detailedUser()?.status === 'ACTIVE' || !detailedUser()?.status, 'bg-red-500/20 text-red-500': detailedUser()?.status === 'BANNED' || detailedUser()?.status === 'SUSPENDED'}">
                      {{ detailedUser()?.status || 'ACTIVE' }}
                  </span>
               </div>
               
               @if (detailedUser()?.bio) {
                  <p class="text-xs italic text-zinc-400 mt-4 text-center px-6">"{{ detailedUser()?.bio }}"</p>
               }
           </div>

           <div class="space-y-4">
               <button (click)="handleOpenMessage(detailedUser())" class="w-full py-4 bg-white text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                   <lucide-icon name="mail" class="w-5 h-5"></lucide-icon> Message Inbox Privé
               </button>

               @if (isSuperAdmin()) {
                   <button (click)="handleSetupAdmin(detailedUser()!)" class="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-xl hover:bg-blue-700 transition-colors flex flex-col items-center justify-center border border-blue-500">
                       <span class="flex items-center gap-2"><lucide-icon name="shield-alert" class="w-5 h-5"></lucide-icon> Gérer Rôles & Claims</span>
                       <span class="text-[8px] opacity-70 mt-1 font-normal lowercase">(Nécessite console Supabase)</span>
                   </button>
               }

               <!-- Actions de base: Bannir ou Débannir -->
               <button (click)="handleBanToggle(detailedUser()!)" [disabled]="detailedUser()?.email === 'mademagic3d@gmail.com' && !isSuperAdmin()" class="w-full py-4 font-black uppercase text-sm tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 border disabled:opacity-50" [ngClass]="detailedUser()?.status === 'BANNED' ? 'bg-emerald-900/30 text-emerald-500 border-emerald-900 hover:bg-emerald-900/50' : 'bg-red-900/30 text-red-500 border-red-900 hover:bg-red-900/50'">
                   @if (detailedUser()?.status === 'BANNED') {
                       <lucide-icon name="user-check" class="w-5 h-5"></lucide-icon> Débannir l'utilisateur
                   } @else {
                       <lucide-icon name="user-x" class="w-5 h-5"></lucide-icon> Bannir l'utilisateur (Système)
                   }
               </button>
           </div>
        </div>
      }

      <!-- OVERLAY MESSAGE (NO ANIMATION) -->
      @if (showMessageForm()) {
        <div class="absolute inset-0 bg-black/90 z-[70] flex items-center justify-center p-6">
          <div class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 class="text-sm font-black uppercase text-white mb-4 flex items-center gap-2">
              <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
              {{ selectedUser() ? "Message à @" + selectedUser()?.username : "Broadcast Général" }}
            </h3>
            <textarea [(ngModel)]="messageContent" placeholder="Contenu du message système..." class="w-full h-32 bg-black border border-zinc-700 rounded-xl p-4 text-white text-sm font-bold outline-none resize-none mb-4 focus:border-white"></textarea>
            <div class="flex gap-2">
              <button (click)="showMessageForm.set(false)" class="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-700">Annuler</button>
              <button (click)="handleSend()" [disabled]="isSending()" class="flex-1 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50">{{ isSending() ? "Envoi..." : "Envoyer" }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  sendNotification = output<{ target: string; content: string }>();

  searchTerm = signal("");
  filter = signal<"ALL" | "ADMIN" | "BANNED">("ALL");
  users = signal<UserProfile[]>([]);
  isLoading = signal(true);

  showMessageForm = signal(false);
  detailedUser = signal<UserProfile | null>(null);
  selectedUser = signal<UserProfile | null>(null);
  
  messageContent = signal("");
  isSending = signal(false);

  filters: ("ALL" | "ADMIN" | "BANNED")[] = ["ALL", "ADMIN", "BANNED"];

  isSuperAdmin = computed(() => {
    return this.authService.isSuperAdmin();
  });

  filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const currentFilter = this.filter();

    return this.users().filter((user) => {
      const matchesSearch =
        user.displayName?.toLowerCase().includes(search) ||
        user.username?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search);
        
      if (currentFilter === "ALL") return matchesSearch;
      if (currentFilter === "BANNED") return matchesSearch && user.status === "BANNED";
      // To filter admins properly, we ideally need to check their claims via backend,
      // but for local UI we can filter by specific emails we know are admin
      if (currentFilter === "ADMIN") return matchesSearch && user.email === 'mademagic3d@gmail.com'; 
      return matchesSearch;
    });
  });

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabaseService.client.from('users').select('*');
      if (error) throw error;
      this.users.set((data as UserProfile[]) || []);
    } catch(e) {
      console.error("Erreur de chargement des utilisateurs", e);
    } finally {
      this.isLoading.set(false);
    }
  }

  handleBack(): boolean {
    if (this.showMessageForm()) {
      this.showMessageForm.set(false);
      return true;
    }
    if (this.detailedUser()) {
       this.closeUserDetail();
       return true;
    }
    return false;
  }

  openUserDetail(user: UserProfile) {
     this.detailedUser.set({...user});
  }

  closeUserDetail() {
     this.detailedUser.set(null);
  }

  handleSetupAdmin(user: UserProfile) {
      alert("ATTENTION: Pour attribuer des rôles sous Supabase, vous devez modifier ou utiliser une fonction serveur sécurisée qui update custom claims (app_metadata).");
  }

  async handleBanToggle(targetUser: UserProfile) {
     const currentUserIsSuperAdmin = this.authService.isSuperAdmin();
     const currentUserIsDev = this.authService.currentUser()?.email === 'mademagic3d@gmail.com';
     
     // Security Rule #3: If a normal admin tries to ban/delete super admin
     if (targetUser.email === 'mademagic3d@gmail.com' && !currentUserIsSuperAdmin && !currentUserIsDev) {
         alert("TENTATIVE DE MUTINERIE DÉTECTÉE. VERROUILLAGE DU SYSTÈME.");
         await this.authService.logout();
         this.router.navigate(['/auth']);
         return;
     }

     const newStatus = targetUser.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
     
     try {
         // Mise à jour via Supabase
         await this.userService.updateUserProfile(targetUser.uid, { status: newStatus });
         
         // Mise à jour de l'UI locale
         this.users.update((prev) =>
            prev.map((u) => {
               if (u.uid === targetUser.uid) {
                 return { ...u, status: newStatus };
               }
               return u;
            })
         );
         
         if (this.detailedUser()?.uid === targetUser.uid) {
            this.detailedUser.update(u => u ? {...u, status: newStatus} : u);
         }
     } catch (e) {
         console.error(e);
         alert("Le changement de statut a échoué.");
     }
  }

  handleOpenMessage(user: UserProfile | null) {
    this.selectedUser.set(user);
    this.showMessageForm.set(true);
  }

  handleSend() {
    if (!this.messageContent().trim()) return;
    this.isSending.set(true);

    const target = this.selectedUser() ? (this.selectedUser()!.username || 'user') : "ALL";

    // Here we'd ideally trigger a Cloud Function to send messages.
    setTimeout(() => {
      this.sendNotification.emit({ target, content: this.messageContent() });
      this.isSending.set(false);
      this.showMessageForm.set(false);
      this.messageContent.set("");
    }, 100);
  }
}

