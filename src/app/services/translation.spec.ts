import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  TranslationService,
  FR_DICTIONARY,
  EN_DICTIONARY,
} from './translation.service';

declare const ensureTestBed: () => void;

function setup(navigatorLanguage = 'fr-FR') {
  ensureTestBed();
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    get: () => navigatorLanguage,
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [TranslationService] });
  return { svc: TestBed.inject(TranslationService) };
}

describe('TranslationService — bootstrap', () => {
  it('falls back to French when nothing is persisted and the navigator is unknown', () => {
    const env = setup('mk-MK');
    expect(env.svc.currentLocale()).toBe('fr');
  });

  it('honours navigator.language when a matching dictionary ships', () => {
    const env = setup('en-US');
    expect(env.svc.currentLocale()).toBe('en');
  });

  it('reads a persisted preference back', () => {
    localStorage.setItem('cake_locale', 'en');
    const env = setup('fr-FR');
    expect(env.svc.currentLocale()).toBe('en');
  });

  it('rejects unknown persisted locales and falls back', () => {
    localStorage.setItem('cake_locale', 'zh');
    const env = setup('fr-FR');
    expect(env.svc.currentLocale()).toBe('fr');
  });
});

describe('TranslationService — t()', () => {
  let env = setup('fr-FR');
  beforeEach(() => { env = setup('fr-FR'); });

  it('returns the French translation for a known key', () => {
    expect(env.svc.t()('NAV_HOME')).toBe('Accueil');
  });

  it('returns the English translation after switching', () => {
    env.svc.switchDictionary('en');
    expect(env.svc.t()('NAV_HOME')).toBe('Home');
  });

  it('falls back to the caller fallback when the key is missing', () => {
    expect(env.svc.t()('UNKNOWN_KEY', 'My default')).toBe('My default');
  });

  it('returns the raw key when nothing else is available', () => {
    expect(env.svc.t()('STILL_UNKNOWN')).toBe('STILL_UNKNOWN');
  });

  it('persists the switch to localStorage', () => {
    env.svc.switchDictionary('en');
    expect(localStorage.getItem('cake_locale')).toBe('en');
  });
});

describe('TranslationService — invariants', () => {
  it('FR and EN dictionaries cover the exact same keys', () => {
    const frKeys = new Set(Object.keys(FR_DICTIONARY.translations));
    const enKeys = new Set(Object.keys(EN_DICTIONARY.translations));
    const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
    const missingInFr = [...enKeys].filter(k => !frKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInFr).toEqual([]);
  });

  it('cannot delete a built-in dictionary', () => {
    const env = setup('fr-FR');
    env.svc.deleteDictionary('fr');
    expect(env.svc.availableDictionaries().find(d => d.id === 'fr')).toBeDefined();
  });
});
