import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NetworkStatusService } from '../../services/network-status.service';
import { TranslationService } from '../../services/translation.service';

/**
 * Persistent banner that surfaces a "Mode hors ligne — contenu en cache"
 * pill whenever {@link NetworkStatusService} reports no connectivity.
 *
 * Position is anchored top-centre, below the vibe ticker, so it never
 * fights the bottom nav for thumb space. It's keyboard-dismissable via
 * `aria-live="polite"` which a screen-reader will announce once when
 * the state flips.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (!network.isOnline()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed left-1/2 -translate-x-1/2 top-[calc(48px+env(safe-area-inset-top))] z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-white/10 shadow-lg backdrop-blur-sm pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
      >
        <lucide-icon name="wifi-off" class="w-3 h-3 text-amber-400"></lucide-icon>
        <span class="text-[10px] font-black uppercase tracking-widest text-zinc-200">
          {{ t()('OFFLINE_BANNER') }}
        </span>
      </div>
    }
  `
})
export class OfflineBannerComponent {
  protected network = inject(NetworkStatusService);
  private translation = inject(TranslationService);
  protected t = this.translation.t;
}
