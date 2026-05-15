import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InteractionService } from './interaction.service';
import { DataService } from './data.service';
import { PrivacyService } from './privacy.service';
import { ReadTimeEstimatorService } from './read-time-estimator.service';
import { Logger } from './logger.service';

declare const ensureTestBed: () => void;

class StubDataService {
  articles = vi.fn(() => [] as unknown[]);
  adjustLikes = vi.fn();
  updateVibe = vi.fn();
}

class StubPrivacy {
  enabled = vi.fn(() => false);
}

class StubEstimator {
  estimate = vi.fn(() => ({ expectedMs: 60_000 }));
}

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      InteractionService,
      Logger,
      { provide: DataService, useClass: StubDataService },
      { provide: PrivacyService, useClass: StubPrivacy },
      { provide: ReadTimeEstimatorService, useClass: StubEstimator },
    ],
  });
  return { svc: TestBed.inject(InteractionService) };
}

describe('InteractionService — hygiène localStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('démarre avec des collections vides', () => {
    const { svc } = setup();
    expect(svc.likedArticles()).toEqual([]);
    expect(svc.savedArticles()).toEqual([]);
    expect(svc.readArticles()).toEqual([]);
  });

  it('persiste un like et le récupère après recréation du service', () => {
    setup().svc.toggleLike('a1');
    const { svc: svc2 } = setup();
    expect(svc2.isLiked('a1')).toBe(true);
  });

  it('un toggle pair retire le like et le supprime du storage', () => {
    const { svc } = setup();
    svc.toggleLike('a1');
    svc.toggleLike('a1');
    expect(svc.isLiked('a1')).toBe(false);
    expect(localStorage.getItem('cake_likes')).toBe('[]');
  });

  it('un JSON corrompu en localStorage est ignoré silencieusement, fallback à la valeur initiale', () => {
    localStorage.setItem('cake_likes', '{not-json}');
    const { svc } = setup();
    // Le parsing échoue → fallback à [] sans throw.
    expect(svc.likedArticles()).toEqual([]);
  });

  it('si localStorage.setItem échoue (quota), la mise à jour signal reste cohérente', () => {
    const { svc } = setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    expect(() => svc.toggleSave('a42')).not.toThrow();
    expect(svc.isSaved('a42')).toBe(true);
    spy.mockRestore();
  });

  it('toggleVibe persiste un vote unique par article et purge les anciens', () => {
    const { svc } = setup();
    svc.toggleVibe('a1', 'choque');
    expect(svc.hasVibe('a1', 'choque')).toBe(true);
    svc.toggleVibe('a1', 'valide');
    expect(svc.hasVibe('a1', 'choque')).toBe(false);
    expect(svc.hasVibe('a1', 'valide')).toBe(true);
  });

  it('completeOnboarding marque le flag et survit à un nouveau service', () => {
    setup().svc.completeOnboarding();
    expect(localStorage.getItem('cake_onboarding')).toBe('true');
    const { svc: svc2 } = setup();
    expect(svc2.hasCompletedOnboarding()).toBe(true);
  });
});
