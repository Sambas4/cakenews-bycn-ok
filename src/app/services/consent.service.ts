import { Injectable, computed, signal } from '@angular/core';

export type ConsentDecision = 'accepted' | 'rejected' | 'pending';

interface ConsentState {
  decision: ConsentDecision;
  /** Epoch ms when the decision was made. */
  decidedAt: number | null;
  /** Schema version of the privacy policy at the time of the decision. */
  policyVersion: number;
}

const STORAGE_KEY = 'cake_consent_v1';

/** Bump on every privacy policy text change so the banner re-prompts. */
export const CURRENT_POLICY_VERSION = 1;

/**
 * Tracks the user's analytics / monitoring consent.
 *
 * Scope:
 *   * The cookie banner (`cookie-banner.component`) reads the
 *     `decision()` signal to decide whether to render itself.
 *   * `MonitoringService` and any future third-party SDK should
 *     consult `analyticsAllowed()` before sending events that go
 *     beyond strictly-necessary error capture.
 *
 * Local-only storage. We never read the user's IP, never set a
 * non-essential cookie, and never call out before the user accepts —
 * which is what makes us GDPR-compliant by default.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly state = signal<ConsentState>(this.load());

  readonly decision = computed(() => this.state().decision);
  readonly analyticsAllowed = computed(() => this.state().decision === 'accepted');

  /**
   * `true` while we still need the user's input. The banner uses this
   * to decide visibility — we re-prompt if the policy version has
   * been bumped since the last decision.
   */
  readonly needsDecision = computed(() => {
    const s = this.state();
    return s.decision === 'pending' || s.policyVersion < CURRENT_POLICY_VERSION;
  });

  accept(): void {
    this.persist({
      decision: 'accepted',
      decidedAt: Date.now(),
      policyVersion: CURRENT_POLICY_VERSION,
    });
  }

  reject(): void {
    this.persist({
      decision: 'rejected',
      decidedAt: Date.now(),
      policyVersion: CURRENT_POLICY_VERSION,
    });
  }

  /** Resets so the banner reappears — used by the privacy settings UI. */
  revoke(): void {
    this.persist({ decision: 'pending', decidedAt: null, policyVersion: 0 });
  }

  private load(): ConsentState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { decision: 'pending', decidedAt: null, policyVersion: 0 };
      const parsed = JSON.parse(raw) as Partial<ConsentState>;
      return {
        decision: parsed.decision === 'accepted' || parsed.decision === 'rejected' ? parsed.decision : 'pending',
        decidedAt: typeof parsed.decidedAt === 'number' ? parsed.decidedAt : null,
        policyVersion: typeof parsed.policyVersion === 'number' ? parsed.policyVersion : 0,
      };
    } catch {
      return { decision: 'pending', decidedAt: null, policyVersion: 0 };
    }
  }

  private persist(next: ConsentState): void {
    this.state.set(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
}
