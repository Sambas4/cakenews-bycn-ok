import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild,
  ElementRef,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { LucideAngularModule } from "lucide-angular";
import { AdminTab, Article, UserProfile } from "../../types";
import { TranslationService } from "../../services/translation.service";
import { ArticleCardComponent } from "../article-card.component";
import { AdminDashboardComponent } from "./admin-dashboard.component";
import { AdminStudioComponent } from "./admin-studio.component";
import { AdminUsersComponent } from "./admin-users.component";
import { AdminAuditComponent } from "./admin-audit.component";
import { AdminCounterBriefsComponent } from "./admin-counter-briefs.component";
import { AdminStatusBadgeComponent } from "./admin-status-badge.component";
import { AdminAntenneComponent } from "./admin-antenne.component";
import { AdminLocalisationComponent } from "./admin-localisation.component";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { SupabaseService } from "../../services/supabase.service";
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
  selector: "app-admin-view",
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ArticleCardComponent,
    AdminDashboardComponent,
    AdminStudioComponent,
    AdminUsersComponent,
    AdminAuditComponent,
    AdminAntenneComponent,
    AdminLocalisationComponent,
    AdminCounterBriefsComponent,
    AdminStatusBadgeComponent,
  ],
  template: `
    <div
      class="h-screen w-full bg-zinc-950 text-white flex flex-col font-sans relative"
    >
      <!-- OVERLAY DE PRÉVISUALISATION - INSTANTANÉ (Pas d'animation) -->
      @if (editingArticle()) {
        <div class="fixed inset-0 z-[400] bg-black flex flex-col">
          <div
            class="h-16 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-50"
          >
            <div class="flex flex-col">
              <span
                class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2"
              >
                <span
                  class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                ></span>
                Studio Live
              </span>
              <span
                class="text-xs text-white/50 font-bold truncate max-w-[200px]"
                >Édition Visuelle</span
              >
            </div>
            <button
              (click)="closePreview()"
              class="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all"
            >
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
              {{ t()("UI_CLOSE") }}
            </button>
          </div>

          <div class="flex-1 w-full relative overflow-hidden bg-black">
            <app-article-card
              [article]="editingArticle()!"
              [isActive]="true"
              [isPreloading]="false"
              [isEditable]="true"
              (onArticleUpdate)="updateEditingArticle($event)"
            ></app-article-card>
          </div>

          <div
            class="shrink-0 bg-zinc-950 border-t border-white/10 p-4 pb-8 flex items-center justify-between gap-4 z-50"
          >
            <div
              class="flex items-center gap-2 bg-black border border-white/10 p-1 rounded-xl"
            >
              <button
                (click)="handleSave('draft')"
                class="p-3 rounded-lg flex flex-col items-center gap-1 min-w-[60px]"
                [ngClass]="
                  editingArticle()!.status === 'draft'
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-white'
                "
              >
                <lucide-icon name="save" class="w-4 h-4"></lucide-icon>
                <span class="text-[8px] font-black uppercase">Brouillon</span>
              </button>
              <button
                (click)="handleSave('scheduled')"
                class="p-3 rounded-lg flex flex-col items-center gap-1 min-w-[60px]"
                [ngClass]="
                  editingArticle()!.status === 'scheduled'
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-500 hover:text-white'
                "
              >
                <lucide-icon name="clock" class="w-4 h-4"></lucide-icon>
                <span class="text-[8px] font-black uppercase">Programmé</span>
              </button>
            </div>
            <button
              (click)="handleSave()"
              class="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              @if (isSaving()) {
                <span class="animate-pulse">Sauvegarde...</span>
              } @else {
                <lucide-icon name="save" class="w-4 h-4"></lucide-icon>
                {{ t()("ACTION_SAVE") }}
              }
            </button>
            <button
              (click)="handleSave('published')"
              class="flex-[1.5] py-4 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <lucide-icon name="send" class="w-4 h-4"></lucide-icon> PUBLIER
            </button>
          </div>
        </div>
      }

      <!-- Admin Header -->
      <div
        class="h-14 bg-black border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-50"
      >
        <div class="flex items-center gap-3">
          @if (activeTab() !== AdminTab.RESEAU) {
            <button
              (click)="handleBackNavigation()"
              class="p-1.5 -ml-2 hover:bg-zinc-800 rounded-lg transition-colors text-white"
            >
              <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
            </button>
          } @else {
            <div class="w-3 h-3 bg-emerald-500 rounded-sm"></div>
          }
          <span
            class="text-xs font-bold font-mono tracking-widest text-zinc-400"
          >
            {{
              activeTab() === AdminTab.RESEAU
                ? "CAKENEWS STUDIO"
                : activeTab().toUpperCase()
            }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <app-admin-status-badge></app-admin-status-badge>
          <button
            (click)="handleLogout()"
            class="text-xs font-black bg-zinc-900 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {{ t()("ADMIN_LOGOUT") }}
          </button>
        </div>
      </div>

      <!-- Main Content Area
           Each tab is wrapped in a defer-on-immediate block so
           Angular emits a separate chunk per panel. The studio (the
           heaviest) used to ride along with the dashboard at admin
           bootstrap time; now an editor lands on Reseau and only
           pays for the one panel they actually opened. -->
      <div class="flex-1 overflow-hidden relative bg-zinc-950">
        @switch (activeTab()) {
          @case (AdminTab.RESEAU) {
            @defer (on immediate) {
              <app-admin-dashboard
                [articles]="articles()"
                [users]="users()"
                (editArticle)="handleEditArticle($event)"
                (deleteArticle)="handleDeleteArticle($event)"
              ></app-admin-dashboard>
            } @placeholder { <div class="h-full"></div> }
          }
          @case (AdminTab.DOSSIERS) {
            @defer (on immediate) {
              <app-admin-studio
                (publish)="handlePublish($event)"
                (preview)="handlePreview($event)"
              ></app-admin-studio>
            } @placeholder { <div class="h-full"></div> }
          }
          @case (AdminTab.UTILISATEURS) {
            @defer (on immediate) {
              <app-admin-users
                (sendNotification)="handleSendNotification($event)"
              ></app-admin-users>
            } @placeholder { <div class="h-full"></div> }
          }
          @case (AdminTab.AUDIT) {
            @defer (on immediate) {
              <app-admin-audit
                (editArticle)="handleEditArticle($event)"
              ></app-admin-audit>
              <app-admin-counter-briefs></app-admin-counter-briefs>
            } @placeholder { <div class="h-full"></div> }
          }
          @case (AdminTab.ANTENNE) {
            @defer (on immediate) {
              <app-admin-antenne></app-admin-antenne>
            } @placeholder { <div class="h-full"></div> }
          }
          @case (AdminTab.LOCALISATION) {
            @defer (on immediate) {
              <app-admin-localisation></app-admin-localisation>
            } @placeholder { <div class="h-full"></div> }
          }
          @default {
            <div class="flex flex-col items-center justify-center h-full text-zinc-600 bg-zinc-950">
              <lucide-icon name="database" class="w-12 h-12 mb-4"></lucide-icon>
              <p class="text-xs font-mono uppercase">Module Offline</p>
            </div>
          }
        }
      </div>

      <!-- Admin Nav (OPTIMISÉ) -->
      <nav
        class="h-20 bg-black border-t border-zinc-800 flex shrink-0 z-50 relative overflow-x-auto hide-scrollbar pb-safe"
      >
        @for (item of navItems; track item.id) {
          <button
            (click)="activeTab.set(item.id)"
            class="flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 transition-all"
            [ngClass]="
              activeTab() === item.id
                ? 'bg-white text-black'
                : 'bg-black text-zinc-600 hover:bg-zinc-900'
            "
          >
            <lucide-icon [name]="item.icon" class="w-6 h-6"></lucide-icon>
            <span
              class="text-[9px] md:text-[10px] font-black uppercase tracking-wider leading-none"
              >{{ item.label }}</span
            >
          </button>
        }
      </nav>
    </div>
  `,
})
export class AdminViewComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  articles = this.dataService.articles;
  users = signal<UserProfile[]>([]);
  private channelUsers: RealtimeChannel | null = null;
  private router = inject(Router);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  async ngOnInit() {
      try {
          const { data, error } = await this.supabaseService.client.from('users').select('*');
          if (!error && data) {
              this.users.set(data as UserProfile[]);
          }
      } catch (e) {
          console.warn('Failed initial fetch of users', e);
      }

      this.channelUsers = this.supabaseService.client.channel('public:users')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
              const { data } = await this.supabaseService.client.from('users').select('*');
              if (data) this.users.set(data as UserProfile[]);
          })
          .subscribe();
  }

  ngOnDestroy() {
     if (this.channelUsers) this.supabaseService.client.removeChannel(this.channelUsers);
  }

  async handleLogout() {
    await this.authService.logout();
    this.router.navigate(["/auth"]);
  }

  private translation = inject(TranslationService);
  t = this.translation.t;

  AdminTab = AdminTab;
  activeTab = signal<AdminTab>(AdminTab.RESEAU);
  previewArticle = signal<Article | null>(null);
  editingArticle = signal<Article | null>(null);
  isSaving = signal(false);

  @ViewChild(AdminDashboardComponent)
  dashboardComponent?: AdminDashboardComponent;
  @ViewChild(AdminStudioComponent) studioComponent?: AdminStudioComponent;
  @ViewChild(AdminUsersComponent) usersComponent?: AdminUsersComponent;
  @ViewChild(AdminAuditComponent) auditComponent?: AdminAuditComponent;
  @ViewChild(AdminAntenneComponent) antenneComponent?: AdminAntenneComponent;
  @ViewChild(AdminLocalisationComponent)
  localisationComponent?: AdminLocalisationComponent;

  navItems = [
    {
      id: AdminTab.RESEAU,
      icon: "bar-chart-3",
      label: this.t()("ADMIN_TAB_NETWORK"),
    },
    {
      id: AdminTab.DOSSIERS,
      icon: "layers",
      label: this.t()("ADMIN_TAB_FILES"),
    },
    {
      id: AdminTab.ANTENNE,
      icon: "radio",
      label: this.t()("ADMIN_TAB_ANTENNA"),
    },
    {
      id: AdminTab.UTILISATEURS,
      icon: "users",
      label: this.t()("ADMIN_TAB_USERS"),
    },
    {
      id: AdminTab.AUDIT,
      icon: "shield-alert",
      label: this.t()("ADMIN_TAB_AUDIT"),
    },
    {
      id: AdminTab.LOCALISATION,
      icon: "globe",
      label: this.t()("ADMIN_TAB_LANG"),
    },
  ];

  handlePreview(article: Article) {
    this.previewArticle.set(article);
    this.editingArticle.set(JSON.parse(JSON.stringify(article)));
  }

  handlePublish(article: Article) {
    this.dataService.upsertArticle(article);
  }

  handleSendNotification(event: { target: string; content: string }) {
    // this.onSendSystemMessage.emit(event);
    console.log("Send notification", event);
  }

  handleEditArticle(articleId: string) {
    const articleToEdit = this.articles().find((a) => a.id === articleId);
    if (articleToEdit) {
      this.handlePreview(articleToEdit);
    } else {
      console.warn("Article introuvable ou supprimé.");
    }
  }

  handleDeleteArticle(articleId: string) {
    this.dataService.deleteArticle(articleId);
  }

  closePreview() {
    this.previewArticle.set(null);
    this.editingArticle.set(null);
  }

  updateEditingArticle(updated: Article) {
    this.editingArticle.set(updated);
  }

  handleSave(status?: "draft" | "scheduled" | "published") {
    const currentEditing = this.editingArticle();
    if (!currentEditing) return;
    this.isSaving.set(true);

    setTimeout(() => {
      const finalArticle = { ...currentEditing };
      if (status) finalArticle.status = status;
      this.dataService.upsertArticle(finalArticle);
      this.isSaving.set(false);
      if (status === "published") {
        this.closePreview();
        if (this.activeTab() === AdminTab.DOSSIERS) {
          this.activeTab.set(AdminTab.RESEAU);
        }
      }
    }, 100);
  }

  handleBackNavigation() {
    let handled = false;
    switch (this.activeTab()) {
      case AdminTab.DOSSIERS:
        handled = this.studioComponent?.handleBack() || false;
        break;
      case AdminTab.UTILISATEURS:
        handled = this.usersComponent?.handleBack() || false;
        break;
      case AdminTab.AUDIT:
        handled = this.auditComponent?.handleBack() || false;
        break;
      case AdminTab.ANTENNE:
        handled = this.antenneComponent?.handleBack() || false;
        break;
      case AdminTab.LOCALISATION:
        handled = this.localisationComponent?.handleBack() || false;
        break;
    }

    if (!handled) {
      this.activeTab.set(AdminTab.RESEAU);
    }
  }
}
