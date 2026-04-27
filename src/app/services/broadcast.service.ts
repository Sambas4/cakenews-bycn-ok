import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { BroadcastCampaign, TickerConfig, ManualRankingEntry } from '../types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RealtimeChannel } from '@supabase/supabase-js';

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

  private channelConfig: RealtimeChannel | null = null;
  private channelBroadcasts: RealtimeChannel | null = null;
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  constructor() {
      effect(() => {
          const user = this.authService.currentUser();
          if (user) {
              this.startSync();
          } else {
              this.stopSync();
          }
      });
  }

  private async startSync() {
      await this.stopSync();

      try {
          // Fetch existing broadcasts
          const { data: broadcastsData, error: broadcastsError } = await this.supabaseService.client
              .from('broadcasts')
              .select('*')
              .neq('id', 'system_config');
          
          if (broadcastsError) throw broadcastsError;
          this.campaigns.set((broadcastsData || []) as BroadcastCampaign[]);

          // Fetch system_config
          const { data: configData, error: configError } = await this.supabaseService.client
              .from('broadcasts')
              .select('*')
              .eq('id', 'system_config')
              .single();
          
          if (!configError && configData) {
              this.config.set({ ...this.config(), ...configData } as TickerConfig);
          }

          // Realtime Broadcasts
          this.channelBroadcasts = this.supabaseService.client.channel('public:broadcasts')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, async (payload) => {
                  const { data } = await this.supabaseService.client.from('broadcasts').select('*').neq('id', 'system_config');
                  if (data) this.campaigns.set(data as BroadcastCampaign[]);
              })
              .subscribe();
              
          // Realtime config could be covered by above channel, just matching id
          this.channelConfig = this.supabaseService.client.channel('public:broadcasts-config')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts', filter: 'id=eq.system_config' }, async (payload) => {
                  if (payload.new) {
                      this.config.set({ ...this.config(), ...(payload.new as any) } as TickerConfig);
                  }
              })
              .subscribe();

      } catch (e) {
          console.error("Supabase Broadcast Sync Error", e);
      }
  }

  private async stopSync() {
      if (this.channelBroadcasts) await this.supabaseService.client.removeChannel(this.channelBroadcasts);
      if (this.channelConfig) await this.supabaseService.client.removeChannel(this.channelConfig);
      this.channelBroadcasts = null;
      this.channelConfig = null;
      this.campaigns.set([]);
  }

  activeTickerMessages = computed(() => {
    return this.campaigns().filter(b => b.schedule.isActive && (b.type === 'INFO' || b.type === 'ALERT'));
  });

  async addCampaign(campaign: BroadcastCampaign) {
    try {
        await this.supabaseService.client.from('broadcasts').upsert({ ...campaign });
    } catch(e) {
        console.error("Error adding campaign", e);
    }
  }

  async updateCampaign(campaign: BroadcastCampaign) {
    try {
        await this.supabaseService.client.from('broadcasts').update({ ...campaign }).eq('id', campaign.id);
    } catch(e) {
        console.error("Error updating campaign", e);
    }
  }

  async deleteCampaign(id: string) {
    try {
        await this.supabaseService.client.from('broadcasts').delete().eq('id', id);
    } catch(e) {
        console.error("Error deleting campaign", e);
    }
  }

  async updateConfig(updates: Partial<TickerConfig>) {
    try {
        const newConfig = { ...this.config(), ...updates, id: 'system_config' };
        await this.supabaseService.client.from('broadcasts').upsert(newConfig);
    } catch(e) {
        console.error("Error updating config", e);
    }
  }

  async addManualRanking(entry: ManualRankingEntry) {
    const newRankings = [...this.config().manualRankings, entry];
    await this.updateConfig({ manualRankings: newRankings });
  }

  async removeManualRanking(id: string) {
    const newRankings = this.config().manualRankings.filter(r => r.id !== id);
    await this.updateConfig({ manualRankings: newRankings });
  }

  async moveRanking(id: string, direction: 'up' | 'down') {
    const current = this.config();
    const index = current.manualRankings.findIndex(r => r.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === current.manualRankings.length - 1) return;

    const newRankings = [...current.manualRankings];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newRankings[index], newRankings[swapIndex]] = [newRankings[swapIndex], newRankings[index]];

    await this.updateConfig({ manualRankings: newRankings });
  }

  recordView(id: string) {
    // Analytics logic
  }
}

