import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FeedModeService, FEED_MODES, FeedMode } from '../services/feed-mode.service';
import { NetworkStatusService } from '../services/network-status.service';
import { DataService } from '../services/data.service';

/**
 * Slim 3-pill mode switcher. Designed to overlay the existing card stack
 * without competing visually — sits above the article header, vibe ticker
 * area. Tap to swap lane; long-press could later open a "what is this"
 * popover.
 */
@Component({
  selector: 'app-feed-mode-switcher',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="absolute top-2 left-1/2 -translate-x-1/2 z-[120] pointer-events-none flex flex-col items-center gap-1.5">
      <div role="tablist" aria-label="Mode du flux"
        class="pointer-events-auto inline-flex items-center gap-1 px-1 py-1 rounded-full bg-black/55 border border-white/10 backdrop-blur-xl shadow-lg">
        @for (m of modes; track m.id) {
          <button type="button"
            role="tab"
            [attr.aria-selected]="active() === m.id"
            [attr.aria-label]="m.label + ' — ' + m.hint"
            (click)="select(m.id)"
            class="relative h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.18em] transition-all"
            [ngClass]="active() === m.id ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white'">
            <lucide-icon [name]="m.icon" class="w-3 h-3"></lucide-icon>
            {{ m.label }}
            @if (active() === m.id) {
              <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" [style.backgroundColor]="m.accent"></span>
            }
          </button>
        }
      </div>
      @if (showOfflineChip()) {
        <span role="status"
          class="pointer-events-auto inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-black uppercase tracking-[0.18em] backdrop-blur-xl shadow"
          [attr.aria-label]="offlineLabel()">
          <lucide-icon name="wifi-off" class="w-3 h-3"></lucide-icon>
          {{ offlineLabel() }}
        </span>
      }
    </div>
  `
})
export class FeedModeSwitcherComponent {
  private mode = inject(FeedModeService);
  private network = inject(NetworkStatusService);
  private data = inject(DataService);

  readonly modes = FEED_MODES;
  active = this.mode.mode;

  /**
   * Surface a discreet status chip when:
   *   - the device is offline, OR
   *   - we are online but Supabase has not yet produced fresh data
   *     (so the feed is being served from the offline cache).
   * This lets the user understand they're reading staged content
   * without changing the card design.
   */
  readonly showOfflineChip = computed(() =>
    !this.network.isOnline() || !this.data.hasFreshData()
  );

  readonly offlineLabel = computed(() =>
    this.network.isOnline() ? 'En cache' : 'Hors ligne'
  );

  select(id: FeedMode) {
    if (this.active() !== id) this.mode.setMode(id);
  }
}
