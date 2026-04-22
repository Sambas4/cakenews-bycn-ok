import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BroadcastService } from '../../services/broadcast.service';
import { ModalService } from '../../services/modal.service';
import { TranslationService } from '../../services/translation.service';
import { MOCK_TICKER_DATA } from '../../data/mockData';

interface TickerItem {
    rank: number;
    name: string;
    score: string;
    category: string;
    isUrgent: boolean;
    isOverlay?: boolean;
    avatar?: string;
    color?: string;
}

interface TickerGroup {
    label: string;
    color: string;
    users: TickerItem[];
}

@Component({
  selector: 'app-vibe-ticker',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative w-full h-[40px] md:h-[48px] bg-black border-b border-white/10 flex items-center z-[60] flex-shrink-0 pointer-events-none">
      <!-- INDICATEUR LIVE FIXE -->
      <div class="absolute left-0 top-0 bottom-0 px-3 md:px-4 bg-black z-20 flex items-center gap-1.5 md:gap-2 border-r border-white/10 pointer-events-auto">
        <div class="relative flex items-center justify-center">
           <div class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-flash" [ngClass]="indicatorColor()"></div>
        </div>
        <span class="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em]" [ngClass]="hasUrgentCampaigns() ? 'text-red-500' : 'text-white'">
            {{indicatorLabel()}}
        </span>
      </div>

      <!-- CONTENEUR DE DEFILEMENT -->
      <div class="flex-1 overflow-hidden relative h-full flex items-center pl-2 md:pl-4 bg-black pointer-events-auto">
        <div 
          class="flex whitespace-nowrap items-center animate-marquee-left" 
          [style.animationDuration]="hasActiveCampaigns() ? '30s' : '60s'"
          style="width: max-content"
        >
          @for (group of loopGroups(); track $index) {
            <div class="flex items-center">
              <!-- TITRE DE LA CATÉGORIE -->
              <div class="px-4 md:px-6 flex items-center gap-1.5 md:gap-2">
                 @if (hasActiveCampaigns()) {
                     @if (hasUrgentCampaigns()) {
                        <lucide-icon name="alert-triangle" class="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500"></lucide-icon>
                     } @else {
                        <lucide-icon name="radio" class="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500"></lucide-icon>
                     }
                 }
                 <span class="text-[12px] md:text-[14px] font-[1000] uppercase tracking-wide" [style.color]="group.color">
                   {{group.label}}
                 </span>
                 <span class="w-0.5 h-0.5 md:w-1 md:h-1 bg-white/40 rounded-full mx-1.5 md:mx-2"></span>
              </div>

              <!-- ITEMS DU TICKER -->
              @for (item of group.users; track $index; let isLast = $last) {
                <div class="flex items-center pr-3 md:pr-4">
                  <div class="group flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all" [ngClass]="getContainerClass(item)">
                    @if (hasActiveCampaigns()) {
                        <div class="flex items-center gap-1.5 md:gap-2">
                            <span class="text-[8px] md:text-[10px] font-black uppercase px-1 md:px-1.5 py-0.5 rounded" [ngClass]="getBadgeClass(item)">
                                {{item.name || 'INFO'}}
                            </span>
                            @if (item.isOverlay && !item.isUrgent) {
                                <lucide-icon name="monitor" class="w-2.5 h-2.5 md:w-3 md:h-3 text-black"></lucide-icon>
                            }
                            <span class="text-[10px] md:text-[12px] font-bold uppercase tracking-tight">
                                {{item.score}}
                            </span>
                        </div>
                    } @else {
                        <span 
                            class="text-[10px] md:text-[12px] font-black uppercase tracking-tight group-hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 md:gap-2" 
                            (click)="openTrophy(item, group)"
                        >
                            @if (showRank(group)) {
                                <span class="text-[8px] md:text-[9px] text-white/40">#{{item.rank}}</span>
                            }
                            {{item.name}}
                        </span>
                        <span 
                            class="text-[8px] md:text-[9px] font-bold px-1 md:px-1.5 py-0.5 rounded bg-white/10 border border-white/5 uppercase"
                            [style.color]="item.color || group.color"
                        >
                            {{item.score}}
                        </span>
                    }
                  </div>
                  @if (!isLast) {
                    <span class="text-[8px] md:text-[10px] text-white/20 font-black mx-1.5 md:mx-2">•</span>
                  }
                </div>
              }
              <div class="w-[1px] h-4 bg-white/20 mx-4"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class VibeTickerComponent {
  private broadcast = inject(BroadcastService);
  private modal = inject(ModalService);
  private translation = inject(TranslationService);
  t = this.translation.t;

  hasActiveCampaigns = computed(() => this.broadcast.activeTickerMessages().length > 0);
  hasUrgentCampaigns = computed(() => this.broadcast.activeTickerMessages().some(msg => msg.priority >= 8));

  displayData = computed<TickerGroup[]>(() => {
    const activeMessages = this.broadcast.activeTickerMessages();
    const config = this.broadcast.config();
    const hasUrgent = this.hasUrgentCampaigns();

    if (activeMessages.length > 0) {
        return [{
            label: hasUrgent ? "ALERTE INFO" : "INFO LIVE",
            color: hasUrgent ? "#ef4444" : "#ffffff",
            users: activeMessages.map(msg => ({
                rank: 0,
                name: msg.name,
                score: msg.message,
                category: 'DIRECT',
                isUrgent: msg.priority >= 8,
                isOverlay: msg.type === 'ALERT'
            }))
        }];
    }

    const groupManualEntries = (entries: any[]): TickerGroup[] => {
        const groups: Record<string, any[]> = {};
        entries.forEach(entry => {
            const cat = entry.categoryLabel || 'DIVERS';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(entry);
        });

        return Object.keys(groups).map(catKey => {
            const customTitle = config.categoryTitles?.[catKey];
            const displayLabel = customTitle || `CLASSEMENT ${catKey}`;
            const groupColor = groups[catKey][0]?.color || '#ffcc00';

            return {
                label: displayLabel,
                color: groupColor,
                users: groups[catKey].map((entry: any, idx: number) => ({
                    rank: idx + 1,
                    name: entry.userName,
                    score: entry.score,
                    category: entry.categoryLabel,
                    avatar: entry.avatar,
                    color: entry.color,
                    isUrgent: false
                }))
            };
        });
    };

    if (config.rankingMode === 'MANUAL' && config.manualRankings.length > 0) {
        return groupManualEntries(config.manualRankings);
    }

    if (config.rankingMode === 'HYBRID') {
        const pinnedNames = new Set(config.manualRankings.map(r => r.userName));
        const pinnedGroups = groupManualEntries(config.manualRankings);
        const filteredAlgoGroups = MOCK_TICKER_DATA.map((group: any) => ({
            ...group,
            users: group.users.filter((u: any) => !pinnedNames.has(u.name)).map((u: any) => ({...u, isUrgent: false}))
        })).filter((group: any) => group.users.length > 0);

        return [...pinnedGroups, ...filteredAlgoGroups] as TickerGroup[];
    }

    return MOCK_TICKER_DATA.map((g: any) => ({
        ...g,
        users: g.users.map((u: any) => ({...u, isUrgent: false}))
    })) as TickerGroup[];
  });

  loopGroups = computed(() => [...this.displayData(), ...this.displayData()]);

  indicatorColor = computed(() => {
    if (this.hasUrgentCampaigns()) return 'bg-red-600';
    if (this.hasActiveCampaigns()) return 'bg-blue-500';
    if (this.broadcast.config().rankingMode === 'MANUAL') return 'bg-[#ffcc00]';
    return 'bg-sky-500';
  });

  indicatorLabel = computed(() => {
    const key = this.hasUrgentCampaigns() ? 'TICKER_URGENT' : (this.hasActiveCampaigns() ? 'TICKER_TARGETED' : (this.broadcast.config().rankingMode === 'MANUAL' ? 'TICKER_TOP' : 'TICKER_LIVE'));
    return this.t()(key);
  });

  getContainerClass(item: TickerItem) {
    if (item.isUrgent) return "bg-red-600 text-white border border-red-500";
    if (item.isOverlay) return "bg-white text-black border border-white";
    return "text-white";
  }

  getBadgeClass(item: TickerItem) {
    if (item.isUrgent) return "bg-white text-red-600";
    if (item.isOverlay) return "bg-black text-white";
    return "bg-blue-600 text-white";
  }

  showRank(group: TickerGroup) {
    const config = this.broadcast.config();
    return config.rankingMode === 'MANUAL' || (config.rankingMode === 'HYBRID' && group.label === "⭐ À LA UNE");
  }

  openTrophy(item: TickerItem, group: TickerGroup) {
    this.modal.openModal('TROPHY', { 
        data: {
            ...item, 
            label: item.category || 'Points', 
            color: item.color || group.color, 
            avatar: item.avatar || `https://i.pravatar.cc/150?u=${item.name}`
        } 
    });
  }
}
