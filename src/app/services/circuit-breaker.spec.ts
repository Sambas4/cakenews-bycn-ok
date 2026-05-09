/**
 * CircuitBreaker specs — verify the breaker fires the right pivot
 * reason at the right cumulative event count.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import { InteractionService } from './interaction.service';

declare const ensureTestBed: () => void;

interface SessionEvent {
  articleId: string;
  category: string;
  author: string;
  durationMs: number;
  expectedDurationMs?: number;
  completionRatio?: number;
  intensity?: 'flick' | 'fast' | 'normal' | 'deep';
  timestamp: number;
}

class StubInteraction {
  history = signal<SessionEvent[]>([]);
  sessionHistory() { return this.history(); }
}

function setup() {
  ensureTestBed();
  const interaction = new StubInteraction();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      CircuitBreakerService,
      { provide: InteractionService, useValue: interaction },
    ],
  });
  const svc = TestBed.inject(CircuitBreakerService);
  return { svc, interaction };
}

function ev(
  intensity: SessionEvent['intensity'],
  category = 'Tech',
  durationMs = 1500,
): SessionEvent {
  return {
    articleId: `a-${Math.random()}`,
    category,
    author: 'A',
    durationMs,
    completionRatio: 0.1,
    intensity,
    timestamp: Date.now(),
  };
}

describe('CircuitBreakerService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('CONTINUEs while fewer than 2 events have accumulated', () => {
    expect(env.svc.verdict().action).toBe('CONTINUE');
    env.interaction.history.set([ev('flick')]);
    expect(env.svc.verdict().action).toBe('CONTINUE');
  });

  it('PIVOTs with INSTANT_FLICKS reason on two flicks early in the session', () => {
    env.interaction.history.set([ev('flick'), ev('flick')]);
    const v = env.svc.verdict();
    expect(v.action).toBe('PIVOT');
    if (v.action === 'PIVOT') expect(v.reason).toBe('INSTANT_FLICKS');
  });

  it('PIVOTs on three fast/flick rejections', () => {
    env.interaction.history.set([ev('fast'), ev('fast'), ev('flick')]);
    const v = env.svc.verdict();
    expect(v.action).toBe('PIVOT');
  });

  it('PIVOTs with CATEGORY_SATURATION when same category is dismissed in a window', () => {
    env.interaction.history.set([
      ev('deep', 'Mode'), ev('normal', 'Cinéma'), ev('normal', 'Mode'),
      ev('fast', 'Tech'), ev('fast', 'Tech'), ev('fast', 'Tech'),
    ]);
    const v = env.svc.verdict();
    expect(v.action).toBe('PIVOT');
    if (v.action === 'PIVOT') {
      expect(['CATEGORY_SATURATION', 'SUSTAINED_FAST_SKIPS']).toContain(v.reason);
    }
  });

  it('CONTINUEs when at least one deep read counterbalances skips', () => {
    env.interaction.history.set([ev('deep'), ev('flick'), ev('flick')]);
    expect(env.svc.verdict().action).toBe('CONTINUE');
  });
});
