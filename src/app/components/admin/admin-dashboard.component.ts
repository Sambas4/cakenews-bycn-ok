import {
  Component,
  Input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { LucideAngularModule } from "lucide-angular";
import { Article } from "../../types";
import { TranslationService } from "../../services/translation.service";

type DashboardSubTab = "SYNTHESE" | "LIVE" | "SYSTEME";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-950 font-sans">
      <div class="flex bg-black border-b border-zinc-800 shrink-0">
        <button
          (click)="activeSubTab.set('SYNTHESE')"
          class="flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors"
          [ngClass]="
            activeSubTab() === 'SYNTHESE'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          "
        >
          <lucide-icon name="activity" class="w-4 h-4"></lucide-icon>
          <span class="text-[10px] font-black uppercase tracking-widest"
            >Pilotage</span
          >
        </button>
        <button
          (click)="activeSubTab.set('LIVE')"
          class="flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors"
          [ngClass]="
            activeSubTab() === 'LIVE'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          "
        >
          <lucide-icon name="list" class="w-4 h-4"></lucide-icon>
          <span class="text-[10px] font-black uppercase tracking-widest"
            >Flux Direct</span
          >
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 pb-32">
        @if (activeSubTab() === "SYNTHESE") {
          <div class="space-y-4">
            <!-- TOP KPIs GRID -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div
                class="bg-zinc-900 p-5 border border-zinc-800 relative overflow-hidden group rounded-2xl"
              >
                <div
                  class="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"
                >
                  <lucide-icon name="users" class="w-8 h-8"></lucide-icon>
                </div>
                <div class="relative z-10">
                  <span
                    class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-2"
                  >
                    <lucide-icon name="users" class="w-3 h-3"></lucide-icon>
                    Audience Live
                  </span>
                  <p class="text-3xl font-[1000] tracking-tight text-white">
                    {{ liveUsers() }}
                  </p>
                  <p class="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                    Lecteurs Actifs
                  </p>
                </div>
              </div>

              <div
                class="bg-zinc-900 p-5 border border-zinc-800 relative overflow-hidden group rounded-2xl"
              >
                <div
                  class="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"
                >
                  <lucide-icon name="user-plus" class="w-8 h-8"></lucide-icon>
                </div>
                <div class="relative z-10">
                  <span
                    class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-2"
                  >
                    <lucide-icon name="user-plus" class="w-3 h-3"></lucide-icon>
                    Acquisition (24h)
                  </span>
                  <p
                    class="text-3xl font-[1000] tracking-tight text-emerald-500"
                  >
                    +{{ newUsersToday() }}
                  </p>
                  <p class="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                    Nouveaux Comptes
                  </p>
                </div>
              </div>

              <div
                class="bg-zinc-900 p-5 border border-zinc-800 relative overflow-hidden group rounded-2xl"
              >
                <div
                  class="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"
                >
                  <lucide-icon name="trending-up" class="w-8 h-8"></lucide-icon>
                </div>
                <div class="relative z-10">
                  <span
                    class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-2"
                  >
                    <lucide-icon
                      name="trending-up"
                      class="w-3 h-3"
                    ></lucide-icon>
                    Viralité
                  </span>
                  <p
                    class="text-3xl font-[1000] tracking-tight text-emerald-500"
                  >
                    9.2
                  </p>
                  <p class="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                    Index / 10
                  </p>
                </div>
              </div>

              <div
                class="bg-zinc-900 p-5 border border-zinc-800 relative overflow-hidden group rounded-2xl"
              >
                <div
                  class="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"
                >
                  <lucide-icon name="zap" class="w-8 h-8"></lucide-icon>
                </div>
                <div class="relative z-10">
                  <span
                    class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-2"
                  >
                    <lucide-icon name="zap" class="w-3 h-3"></lucide-icon>
                    Débats
                  </span>
                  <p class="text-3xl font-[1000] tracking-tight text-white">
                    {{ (totalComments() / 1000).toFixed(1) }}k
                  </p>
                  <p class="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                    Messages échangés
                  </p>
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT SPLIT -->
            <div class="flex flex-col lg:flex-row gap-4">
              <!-- LEFT: ACTIVITY & GEO -->
              <div class="flex-1 space-y-4">
                <div class="bg-zinc-900 border border-zinc-800 p-5">
                  <div class="flex justify-between items-center mb-6">
                    <h3
                      class="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"
                    >
                      <lucide-icon
                        name="trending-up"
                        class="w-3 h-3"
                      ></lucide-icon>
                      Pic de Lecture (24h)
                    </h3>
                    <span
                      class="text-[9px] bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded"
                      >EN DIRECT</span
                    >
                  </div>
                  <!-- Graph Bars -->
                  <div class="flex items-end justify-between h-32 gap-1">
                    @for (
                      h of [
                        40, 25, 30, 45, 60, 85, 70, 90, 60, 50, 40, 55, 75, 95,
                        100, 85, 70, 60, 45, 30,
                      ];
                      track $index
                    ) {
                      <div
                        class="flex-1 bg-zinc-800 hover:bg-white transition-colors cursor-crosshair group relative"
                        [style.height.%]="h"
                      ></div>
                    }
                  </div>
                  <div
                    class="flex justify-between mt-2 text-[8px] font-mono text-zinc-600 uppercase"
                  >
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:59</span>
                  </div>
                </div>

                <div class="bg-zinc-900 border border-zinc-800 p-5">
                  <h3
                    class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"
                  >
                    <lucide-icon name="map-pin" class="w-3 h-3"></lucide-icon>
                    Pénétration Géographique
                  </h3>
                  <div class="space-y-3">
                    @for (
                      zone of [
                        {
                          name: "Libreville / Louis",
                          val: 45,
                          col: "bg-emerald-500",
                        },
                        {
                          name: "Libreville / Nzeng Ayong",
                          val: 32,
                          col: "bg-blue-500",
                        },
                        {
                          name: "Port-Gentil / Centre",
                          val: 18,
                          col: "bg-purple-500",
                        },
                        {
                          name: "Paris / 16ème (Diaspora)",
                          val: 12,
                          col: "bg-zinc-500",
                        },
                      ];
                      track zone.name;
                      let idx = $index
                    ) {
                      <div class="flex items-center gap-3">
                        <span class="text-[9px] font-mono text-zinc-400 w-6"
                          >0{{ idx + 1 }}</span
                        >
                        <div class="flex-1">
                          <div class="flex justify-between mb-1">
                            <span
                              class="text-[10px] font-bold text-white uppercase"
                              >{{ zone.name }}</span
                            >
                            <span class="text-[9px] font-mono text-zinc-500"
                              >{{ zone.val }}%</span
                            >
                          </div>
                          <div
                            class="w-full h-1 bg-black rounded-full overflow-hidden"
                          >
                            <div
                              class="h-full"
                              [ngClass]="zone.col"
                              [style.width.%]="zone.val"
                            ></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- RIGHT: EDITORIAL INTELLIGENCE -->
              <div class="w-full lg:w-1/3 flex flex-col gap-4">
                <!-- VIBE MÉTÉO - Remplaçant CPU/RAM -->
                <div class="bg-zinc-900 border border-zinc-800 p-5 flex-1">
                  <h3
                    class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"
                  >
                    <lucide-icon
                      name="bar-chart-2"
                      class="w-3 h-3"
                    ></lucide-icon>
                    Météo de l'Opinion
                  </h3>

                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">🤯</span>
                        <div>
                          <span
                            class="text-[10px] font-bold text-white uppercase block"
                            >Choqué</span
                          >
                          <span class="text-[8px] text-zinc-500 font-mono"
                            >Dominant sur "Politique"</span
                          >
                        </div>
                      </div>
                      <span class="text-xl font-[1000] text-white">42%</span>
                    </div>
                    <div
                      class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"
                    >
                      <div class="h-full bg-white w-[42%]"></div>
                    </div>

                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">🚀</span>
                        <div>
                          <span
                            class="text-[10px] font-bold text-white uppercase block"
                            >Bullish</span
                          >
                          <span class="text-[8px] text-zinc-500 font-mono"
                            >Dominant sur "Crypto"</span
                          >
                        </div>
                      </div>
                      <span class="text-xl font-[1000] text-white">28%</span>
                    </div>
                    <div
                      class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"
                    >
                      <div class="h-full bg-green-500 w-[28%]"></div>
                    </div>

                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">🤨</span>
                        <div>
                          <span
                            class="text-[10px] font-bold text-white uppercase block"
                            >Sceptique</span
                          >
                          <span class="text-[8px] text-zinc-500 font-mono"
                            >Dominant sur "Tech"</span
                          >
                        </div>
                      </div>
                      <span class="text-xl font-[1000] text-white">15%</span>
                    </div>
                    <div
                      class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"
                    >
                      <div class="h-full bg-amber-500 w-[15%]"></div>
                    </div>
                  </div>
                </div>

                <!-- SIGNAUX FAIBLES - Remplaçant Logs -->
                <div class="bg-zinc-900 border border-zinc-800 p-5 flex-1">
                  <h3
                    class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"
                  >
                    <lucide-icon name="hash" class="w-3 h-3"></lucide-icon>
                    Signaux Faibles (Trending)
                  </h3>
                  <div class="space-y-2">
                    @for (
                      item of [
                        {
                          tag: "CoupureEau",
                          count: "+450%",
                          status: "critical",
                        },
                        { tag: "CAN2025", count: "+120%", status: "rising" },
                        { tag: "Starlink", count: "+85%", status: "stable" },
                        { tag: "PrixEssence", count: "+60%", status: "stable" },
                      ];
                      track item.tag
                    ) {
                      <div
                        class="flex items-center justify-between p-2 bg-black border border-zinc-800 rounded-lg"
                      >
                        <span class="text-[10px] font-bold text-white uppercase"
                          >#{{ item.tag }}</span
                        >
                        <span
                          class="text-[9px] font-black px-1.5 py-0.5 rounded"
                          [ngClass]="
                            item.status === 'critical'
                              ? 'bg-red-500 text-white'
                              : item.status === 'rising'
                                ? 'bg-emerald-500 text-black'
                                : 'text-zinc-500'
                          "
                        >
                          {{ item.count }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        @if (activeSubTab() === "LIVE") {
          <div>
            <div class="flex items-center justify-between mb-4 px-1">
              <h3
                class="text-xs font-black uppercase tracking-widest text-zinc-500"
              >
                Flux de Publication
              </h3>
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                ></span>
                <span
                  class="text-[9px] font-bold text-red-500 uppercase tracking-wider"
                  >LIVE</span
                >
              </div>
            </div>
            <div class="flex flex-col gap-1">
              @for (article of articles; track article.id) {
                <div
                  class="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer transition-colors group"
                >
                  <span
                    class="text-[9px] font-mono text-zinc-600 group-hover:text-white"
                    >{{ article.timestamp }}</span
                  >
                  <div
                    class="w-1 h-8"
                    [ngClass]="
                      article.isExclusive ? 'bg-red-600' : 'bg-zinc-700'
                    "
                  ></div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-white truncate">
                      {{ article.title }}
                    </h4>
                    <div class="flex items-center gap-3 mt-1">
                      <span
                        class="text-[9px] font-bold text-zinc-500 uppercase bg-black px-1.5 py-0.5 rounded border border-zinc-800"
                        >{{ article.category }}</span
                      >
                      <span
                        class="text-[9px] text-zinc-500 font-mono flex items-center gap-1"
                      >
                        <lucide-icon name="eye" class="w-3 h-3"></lucide-icon>
                        {{ article.likes }}
                      </span>
                    </div>
                  </div>
                  <div
                    class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                  >
                    <button
                      (click)="editArticle.emit(article.id)"
                      class="text-[9px] font-black uppercase bg-white text-black px-3 py-1.5 rounded hover:bg-zinc-200"
                    >
                      Éditer
                    </button>
                    <button
                      (click)="deleteArticle.emit(article.id)"
                      class="text-[9px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @Input() articles: Article[] = [];
  editArticle = output<string>();
  deleteArticle = output<string>();

  private translation = inject(TranslationService);
  t = this.translation.t;

  activeSubTab = signal<DashboardSubTab>("SYNTHESE");

  totalComments = computed(() =>
    this.articles.reduce((acc, curr) => acc + curr.comments, 0),
  );
  liveUsers = signal(1420);
  newUsersToday = signal(342);

  private intervalId: any;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.liveUsers.update((v) =>
        Math.max(0, v + Math.floor(Math.random() * 11) - 5),
      );
    }, 3000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
