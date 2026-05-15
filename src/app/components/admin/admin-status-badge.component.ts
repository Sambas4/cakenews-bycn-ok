import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StatusService } from '../../services/status.service';

/**
 * Single-glance system health badge for the admin shell.
 *
 * Rendered at the top-right of the studio. Three states:
 *   * `ok`        — green dot, everything reachable.
 *   * `degraded`  — amber dot, at least one component failed the last
 *                    healthcheck.
 *   * `unknown`   — grey dot, no successful poll in the staleness
 *                    window (or the StatusService hasn't started).
 *
 * Tap the badge for a tooltip-style breakdown of the per-component
 * checks, no modal required.
 */
@Component({
  selector: 'app-admin-status-badge',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <button type="button" (click)="expanded = !expanded"
      [attr.aria-label]="'Statut du système : ' + label()"
      class="relative inline-flex items-center gap-2 px-2.5 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
      <span class="w-2 h-2 rounded-full" [ngClass]="dotClass()" aria-hidden="true"></span>
      <span class="text-[10px] font-black uppercase tracking-widest" [ngClass]="textClass()">
        {{ label() }}
      </span>

      @if (expanded && snapshot()) {
        <div role="dialog" aria-label="Détails de l'état du système"
          class="absolute right-0 top-full mt-2 z-50 w-[260px] bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl p-3 text-left">
          <p class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            Composants
          </p>
          <ul class="space-y-1.5">
            @for (entry of components(); track entry.name) {
              <li class="flex items-center justify-between text-[11.5px]">
                <span class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full"
                    [ngClass]="entry.ok ? 'bg-emerald-400' : 'bg-red-400'" aria-hidden="true"></span>
                  <span class="text-white">{{ entry.name }}</span>
                </span>
                <span class="text-zinc-500 font-mono text-[10.5px]">
                  {{ entry.latency }}
                </span>
              </li>
            }
          </ul>
          <p class="text-[10px] text-zinc-600 mt-3">
            Sondé à {{ fetchedTime() }}
          </p>
        </div>
      }
    </button>
  `,
})
export class AdminStatusBadgeComponent implements OnInit {
  private status = inject(StatusService);

  protected expanded = false;

  readonly snapshot = this.status.snapshotSignal;

  readonly label = computed(() => {
    switch (this.status.status()) {
      case 'ok':       return 'Opérationnel';
      case 'degraded': return 'Dégradé';
      default:         return 'Indéterminé';
    }
  });

  readonly dotClass = computed(() => {
    switch (this.status.status()) {
      case 'ok':       return 'bg-emerald-400';
      case 'degraded': return 'bg-amber-400 animate-pulse';
      default:         return 'bg-zinc-500';
    }
  });

  readonly textClass = computed(() => {
    switch (this.status.status()) {
      case 'ok':       return 'text-emerald-300';
      case 'degraded': return 'text-amber-300';
      default:         return 'text-zinc-400';
    }
  });

  readonly components = computed(() => {
    const s = this.snapshot();
    if (!s) return [];
    return Object.entries(s.checks).map(([name, c]) => ({
      name,
      ok: c.ok,
      latency: c.latencyMs !== undefined ? `${c.latencyMs} ms` : (c.ok ? 'ok' : 'KO'),
    }));
  });

  readonly fetchedTime = computed(() => {
    const s = this.snapshot();
    if (!s) return '—';
    return new Date(s.fetchedAt).toLocaleTimeString();
  });

  ngOnInit(): void { this.status.start(); }
  // No ngOnDestroy: StatusService is app-scoped, the timer outlives
  // any single admin badge mount.
}
