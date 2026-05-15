import { Injectable, computed, inject } from '@angular/core';
import { Article } from '../types';
import { DataService } from './data.service';
import { VibeSignalService } from './vibe-signal.service';

export type CounterBriefStatus = 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'PUBLISHED' | 'DISMISSED';

export interface CounterBriefCandidate {
  id: string;
  sourceArticleId: string;
  sourceTitle: string;
  sourceCategory: string;
  scepticPercent: number;
  totalVibes: number;
  weight: number;
  detectedAt: number;
  status: CounterBriefStatus;
  assignedTo?: string;
  note?: string;
}

const STORAGE_KEY = 'cake_counter_briefs';

/**
 * Editorial inbox derived from {@link VibeSignalService}. When a piece
 * accumulates a critical mass of "Sceptique" reactions, the studio gets
 * a candidate ticket suggesting a follow-up reporting (the "Counter-
 * Brief"). The newsroom can triage, assign or dismiss.
 *
 * Persistence: status is local-first by design. A real deployment will
 * sync to a `counter_briefs` Supabase table with RLS allowing only
 * editors to read/write; the in-memory shape is stable so we won't have
 * to redesign the UI when we introduce the migration.
 *
 * Concurrency note: every signal recomputation derives candidates from
 * the *current* article inventory. We never blindly delete a candidate
 * just because the underlying signal cooled down — once raised, only
 * the studio can close it (DISMISSED) or PUBLISH the counter-brief.
 */
@Injectable({ providedIn: 'root' })
export class CounterBriefService {
  private data = inject(DataService);
  private vibe = inject(VibeSignalService);

  /** Live candidates merged with persisted statuses. */
  readonly candidates = computed<CounterBriefCandidate[]>(() => {
    const persisted = this.load();
    const live = this.vibe.counterBriefCandidates();
    const articles = new Map(this.data.articles().map(a => [a.id, a]));

    // Index persisted by source article so we keep the same id and status.
    const byArticle = new Map(persisted.map(c => [c.sourceArticleId, c]));

    const out: CounterBriefCandidate[] = [];

    // Merge live signals into persisted state.
    for (const pulse of live) {
      const art = articles.get(pulse.articleId);
      if (!art) continue;

      const existing = byArticle.get(pulse.articleId);
      const counterSignal = pulse.signals.find(s => s.kind === 'COUNTER_BRIEF');
      const weight = counterSignal?.weight ?? 0;

      if (existing) {
        // Refresh metrics but keep status / assignment / note.
        out.push({
          ...existing,
          scepticPercent: Math.round(pulse.ratios.sceptique * 100),
          totalVibes: pulse.total,
          weight,
        });
        byArticle.delete(pulse.articleId);
      } else {
        out.push(this.fresh(art, pulse.ratios.sceptique, pulse.total, weight));
      }
    }

    // Keep persisted candidates that are no longer "live" but not closed.
    for (const remaining of byArticle.values()) {
      if (remaining.status === 'DISMISSED' || remaining.status === 'PUBLISHED') continue;
      out.push(remaining);
    }

    return out.sort((a, b) => {
      const order: Record<CounterBriefStatus, number> = {
        NEW: 0, TRIAGED: 1, ASSIGNED: 2, PUBLISHED: 3, DISMISSED: 4,
      };
      const oa = order[a.status];
      const ob = order[b.status];
      return oa !== ob ? oa - ob : b.weight - a.weight;
    });
  });

  /** Human-friendly count for the studio badge. */
  readonly newCount = computed(() =>
    this.candidates().filter(c => c.status === 'NEW' || c.status === 'TRIAGED').length
  );

  setStatus(id: string, status: CounterBriefStatus, opts: { assignedTo?: string; note?: string } = {}) {
    const persisted = this.load();
    const idx = persisted.findIndex(c => c.id === id);
    let next: CounterBriefCandidate | undefined;
    if (idx >= 0) {
      next = { ...persisted[idx]!, status, ...opts };
      persisted[idx] = next;
    } else {
      // Unknown — promote from the live derivation.
      const candidate = this.candidates().find(c => c.id === id);
      if (!candidate) return;
      next = { ...candidate, status, ...opts };
      persisted.push(next);
    }
    this.persist(persisted);
  }

  private fresh(article: Article, scepticRatio: number, total: number, weight: number): CounterBriefCandidate {
    return {
      id: `cb-${article.id}`,
      sourceArticleId: article.id,
      sourceTitle: article.title,
      sourceCategory: article.category,
      scepticPercent: Math.round(scepticRatio * 100),
      totalVibes: total,
      weight,
      detectedAt: Date.now(),
      status: 'NEW',
    };
  }

  private load(): CounterBriefCandidate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as CounterBriefCandidate[];
    } catch {
      return [];
    }
  }

  private persist(list: CounterBriefCandidate[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }
}
