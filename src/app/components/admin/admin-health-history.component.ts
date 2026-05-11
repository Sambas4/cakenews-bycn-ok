import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { HealthSnapshot, HealthSnapshotsService, HealthStatus } from '../../services/health-snapshots.service';

interface CellViewModel {
  id: number;
  status: HealthStatus;
  recordedAt: string;
  tooltip: string;
  cssClass: string;
}

const STATUS_CLASS: Record<HealthStatus, string> = {
  ok:       'bg-emerald-400/80 hover:bg-emerald-400',
  degraded: 'bg-amber-400/80   hover:bg-amber-400',
  unknown:  'bg-zinc-600/70    hover:bg-zinc-500',
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok:       'OK',
  degraded: 'Dégradé',
  unknown:  'Inconnu',
};

/**
 * Compact 24h health timeline for the admin AUDIT tab.
 *
 * Each persisted `health_snapshots` row renders as one cell in a
 * dense grid. Hovering shows the timestamp and the failing
 * components. The badge in the top-right summarises the rolling
 * uptime ratio so reviewers don't need to count green squares to
 * spot a partial outage.
 *
 * The component subscribes via {@link HealthSnapshotsService}.start
 * on mount; the service handles polling, visibility-aware refresh
 * and a 24h trim. We never call .stop() because the service is
 * app-scoped and the admin shell may remount this panel on every
 * tab change.
 */
@Component({
  selector: 'app-admin-health-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="p-4">
      <header class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <lucide-icon name="activity" class="w-4 h-4 text-emerald-300" aria-hidden="true"></lucide-icon>
          <h2 class="text-[14px] font-[1000] tracking-tight">Santé système · 24h</h2>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] font-black uppercase tracking-widest"
            [ngClass]="uptimeBadgeClass()">
            {{ uptimePercent() }}% OK
          </span>
          <button type="button" (click)="manualRefresh()" [disabled]="health.loading()"
            aria-label="Rafraîchir l'historique"
            class="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50">
            <lucide-icon name="refresh-cw" class="w-3.5 h-3.5"
              [class.animate-spin]="health.loading()"></lucide-icon>
          </button>
        </div>
      </header>

      @if (health.errored() && cells().length === 0) {
        <div class="bg-red-500/[0.04] border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <lucide-icon name="alert-triangle" class="w-4 h-4 text-red-300" aria-hidden="true"></lucide-icon>
          <span class="text-[12px] text-red-300">
            Lecture de l'historique impossible. Vérifie que la migration 0006 et le job pg_cron sont en place.
          </span>
        </div>
      } @else if (cells().length === 0) {
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
          <lucide-icon name="clock" class="w-6 h-6 mx-auto text-zinc-500 mb-2"></lucide-icon>
          <p class="text-[12.5px] text-zinc-400">Aucune mesure encore enregistrée.</p>
          <p class="text-[10.5px] text-zinc-500 mt-1 leading-snug">
            Le cron tourne toutes les minutes — reviens dans un instant.
          </p>
        </div>
      } @else {
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div class="grid grid-cols-[repeat(auto-fill,minmax(8px,1fr))] gap-[3px]"
               role="img"
               [attr.aria-label]="'Timeline ' + cells().length + ' mesures, ' + uptimePercent() + '% OK'">
            @for (cell of cells(); track cell.id) {
              <span class="block h-3 rounded-[2px] transition-colors"
                [ngClass]="cell.cssClass"
                [title]="cell.tooltip"></span>
            }
          </div>

          <div class="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-[2px] bg-emerald-400" aria-hidden="true"></span> OK
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-[2px] bg-amber-400" aria-hidden="true"></span> Dégradé
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-[2px] bg-zinc-600" aria-hidden="true"></span> Inconnu
            </span>
            <span class="ml-auto text-zinc-600 normal-case tracking-normal text-[10.5px]">
              Dernière mesure : {{ lastMeasuredLabel() }}
            </span>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminHealthHistoryComponent implements OnInit {
  protected health = inject(HealthSnapshotsService);

  /** Render the most-recent slice newest-first → left-to-right is
   *  oldest-to-newest in the grid for natural reading. */
  readonly cells = computed<CellViewModel[]>(() => {
    const rows = this.health.snapshots();
    return [...rows].reverse().map(this.toCellViewModel);
  });

  readonly uptimePercent = computed(() => Math.round(this.health.uptimeRatio() * 100));

  readonly uptimeBadgeClass = computed(() => {
    const pct = this.uptimePercent();
    if (pct >= 99) return 'text-emerald-300';
    if (pct >= 90) return 'text-amber-300';
    return 'text-red-300';
  });

  readonly lastMeasuredLabel = computed(() => {
    const latest = this.health.latest();
    if (!latest) return '—';
    try {
      const d = new Date(latest.recordedAt);
      return d.toLocaleTimeString();
    } catch {
      return latest.recordedAt;
    }
  });

  ngOnInit(): void {
    this.health.start();
  }

  manualRefresh(): void {
    void this.health.refresh();
  }

  private toCellViewModel(row: HealthSnapshot): CellViewModel {
    const failingComponents = Object.entries(
      (row.body['checks'] as Record<string, { ok?: boolean }> | undefined) ?? {}
    )
      .filter(([, v]) => v?.ok === false)
      .map(([k]) => k);

    const date = (() => {
      try { return new Date(row.recordedAt).toLocaleString(); }
      catch { return row.recordedAt; }
    })();

    const tooltip = failingComponents.length === 0
      ? `${date} · ${STATUS_LABEL[row.status]}`
      : `${date} · ${STATUS_LABEL[row.status]} (${failingComponents.join(', ')})`;

    return {
      id: row.id,
      status: row.status,
      recordedAt: row.recordedAt,
      tooltip,
      cssClass: STATUS_CLASS[row.status],
    };
  }
}
