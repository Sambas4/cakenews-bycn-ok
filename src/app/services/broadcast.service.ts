import { Injectable, signal, computed } from '@angular/core';
import { BroadcastCampaign, TickerConfig, ManualRankingEntry } from '../types';

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {
  campaigns = signal<BroadcastCampaign[]>([]);
  
  config = signal<TickerConfig>({
    mode: 'AUTO',
    speed: 'normal',
    defaultLocation: 'Global',
    manualRankings: [],
    rankingMode: 'AUTO',
    categoryTitles: {}
  });

  activeTickerMessages = computed(() => {
    return this.campaigns().filter(b => b.schedule.isActive && (b.type === 'INFO' || b.type === 'ALERT'));
  });

  addCampaign(campaign: BroadcastCampaign) {
    this.campaigns.update(current => [...current, campaign]);
  }

  updateCampaign(campaign: BroadcastCampaign) {
    this.campaigns.update(current => current.map(c => c.id === campaign.id ? campaign : c));
  }

  deleteCampaign(id: string) {
    this.campaigns.update(current => current.filter(c => c.id !== id));
  }

  updateConfig(updates: Partial<TickerConfig>) {
    this.config.update(current => ({ ...current, ...updates }));
  }

  addManualRanking(entry: ManualRankingEntry) {
    this.config.update(current => ({
      ...current,
      manualRankings: [...current.manualRankings, entry]
    }));
  }

  removeManualRanking(id: string) {
    this.config.update(current => ({
      ...current,
      manualRankings: current.manualRankings.filter(r => r.id !== id)
    }));
  }

  moveRanking(id: string, direction: 'up' | 'down') {
    this.config.update(current => {
      const index = current.manualRankings.findIndex(r => r.id === id);
      if (index === -1) return current;
      if (direction === 'up' && index === 0) return current;
      if (direction === 'down' && index === current.manualRankings.length - 1) return current;

      const newRankings = [...current.manualRankings];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newRankings[index], newRankings[swapIndex]] = [newRankings[swapIndex], newRankings[index]];

      return { ...current, manualRankings: newRankings };
    });
  }

  recordView(id: string) {
    // Analytics logic
  }
}
