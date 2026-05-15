import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { InteractionService } from '../../services/interaction.service';
import { DataService } from '../../services/data.service';

type Axis = 'analytical' | 'emotion' | 'factual' | 'polemic' | 'fun' | 'inspiring';

interface AxisDef {
  id: Axis;
  label: string;
  /** Tones from `Article.metadata.tone` that contribute to this axis. */
  tones: ReadonlyArray<string>;
  /** Categories that strongly contribute (heuristic). */
  categories: ReadonlyArray<string>;
  color: string;
}

const AXES: ReadonlyArray<AxisDef> = [
  { id: 'analytical', label: 'Analytique', tones: ['Analytique'],   categories: ['Économie', 'Tech', 'Science', 'IA', 'Politique'],         color: '#7ae25c' },
  { id: 'factual',    label: 'Factuel',    tones: ['Factuel'],      categories: ['International', 'Justice', 'Société', 'Environnement'],   color: '#38bdf8' },
  { id: 'emotion',    label: 'Émotion',    tones: ['Polémique'],    categories: ['Faits Divers', 'Société', 'Guerre', 'People'],            color: '#f472b6' },
  { id: 'polemic',    label: 'Polémique',  tones: ['Polémique'],    categories: ['Opinion Choc', 'Politique'],                              color: '#ef4444' },
  { id: 'fun',        label: 'Fun',        tones: ['Divertissant'], categories: ['Humour', 'Manga', 'Gaming', 'People', 'Cinéma'],          color: '#facc15' },
  { id: 'inspiring',  label: 'Inspirant',  tones: ['Inspirant'],    categories: ['Culture', 'Mode', 'Voyage', 'Architecture', 'Startups'],  color: '#a78bfa' },
];

const SVG_SIZE = 180;
const CENTER = SVG_SIZE / 2;
const RADIUS = SVG_SIZE / 2 - 18;

/**
 * Six-axis cognitive footprint chart. Replaces the older flat % strip
 * in the Activity tab when there is enough engagement to draw it.
 *
 * Why a radar? Categories overlap (Tech can be analytical *and* fun).
 * A radar lets us project the same reads onto orthogonal cognitive
 * dimensions, revealing the *texture* of someone's media diet rather
 * than just which buckets they fell into.
 */
@Component({
  selector: 'app-cognitive-radar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5 relative overflow-hidden">
      <header class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <lucide-icon name="sparkles" class="w-4 h-4 text-violet-300"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Empreinte cognitive</h3>
        </div>
        <span class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          Mois en cours
        </span>
      </header>

      @if (signalCount() === 0) {
        <p class="text-[12.5px] text-zinc-400 leading-snug">
          Lis quelques articles pour révéler la texture de ta diète informationnelle.
        </p>
      } @else {
        <div class="flex items-center justify-center">
          <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="w-[200px] h-[200px]" aria-hidden="true">
            <!-- Concentric rings -->
            @for (r of rings; track r) {
              <circle [attr.cx]="center" [attr.cy]="center" [attr.r]="r * radius"
                fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            }
            <!-- Axis spokes -->
            @for (axis of axesGeom(); track axis.id) {
              <line [attr.x1]="center" [attr.y1]="center"
                [attr.x2]="axis.fx" [attr.y2]="axis.fy"
                stroke="rgba(255,255,255,0.05)" stroke-width="1" />
            }
            <!-- Filled polygon -->
            <polygon [attr.points]="polygonPoints()"
              fill="rgba(167,139,250,0.18)"
              stroke="#a78bfa" stroke-width="1.5" stroke-linejoin="round" />
            <!-- Axis dots -->
            @for (axis of axesGeom(); track axis.id) {
              <circle [attr.cx]="axis.dotX" [attr.cy]="axis.dotY" r="3.5"
                [attr.fill]="axis.color" />
            }
          </svg>
        </div>

        <ul class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          @for (axis of axesGeom(); track axis.id) {
            <li class="flex items-center justify-between text-[11.5px]">
              <span class="flex items-center gap-1.5 min-w-0">
                <span class="w-2 h-2 rounded-full shrink-0" [style.backgroundColor]="axis.color"></span>
                <span class="text-zinc-300 truncate">{{ axis.label }}</span>
              </span>
              <span class="font-mono tabular-nums text-zinc-500">{{ axis.percent }}%</span>
            </li>
          }
        </ul>
      }
    </section>
  `
})
export class CognitiveRadarComponent {
  private interaction = inject(InteractionService);
  private data = inject(DataService);

  readonly size = SVG_SIZE;
  readonly center = CENTER;
  readonly radius = RADIUS;
  readonly rings = [0.33, 0.66, 1] as const;

  readonly signalCount = computed(() => this.interaction.sessionHistory().length);

  /** Per-axis raw weight, normalised to [0..1] for plotting. */
  private readonly weights = computed<Record<Axis, number>>(() => {
    const w: Record<Axis, number> = {
      analytical: 0, factual: 0, emotion: 0, polemic: 0, fun: 0, inspiring: 0,
    };
    const articlesById = new Map(this.data.articles().map(a => [a.id, a]));
    const sessions = this.interaction.sessionHistory();
    const liked = new Set(this.interaction.likedArticles());

    for (const ev of sessions) {
      const article = articlesById.get(ev.articleId);
      if (!article) continue;
      const weight = (ev.completionRatio ?? 0.3) + (liked.has(ev.articleId) ? 0.5 : 0);
      const tone = article.metadata?.tone;
      for (const axis of AXES) {
        let contribution = 0;
        if (tone && axis.tones.includes(tone)) contribution += 1;
        if (axis.categories.includes(article.category)) contribution += 0.5;
        if (contribution > 0) w[axis.id] += contribution * weight;
      }
    }

    // Normalise so the strongest axis sits at 1.0; otherwise the chart
    // looks empty for casual readers.
    const max = Math.max(...Object.values(w));
    if (max > 0) {
      (Object.keys(w) as Axis[]).forEach(k => { w[k] = w[k] / max; });
    }
    return w;
  });

  readonly axesGeom = computed(() => AXES.map((axis, i) => {
    const angle = (-Math.PI / 2) + (i * (2 * Math.PI / AXES.length));
    const w = this.weights()[axis.id];
    const fx = CENTER + Math.cos(angle) * RADIUS;
    const fy = CENTER + Math.sin(angle) * RADIUS;
    const dx = CENTER + Math.cos(angle) * RADIUS * w;
    const dy = CENTER + Math.sin(angle) * RADIUS * w;
    return {
      ...axis,
      angle,
      fx, fy,
      dotX: dx,
      dotY: dy,
      percent: Math.round(w * 100),
    };
  }));

  readonly polygonPoints = computed(() =>
    this.axesGeom().map(p => `${p.dotX},${p.dotY}`).join(' ')
  );
}
