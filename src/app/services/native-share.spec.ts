import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NativeShareService } from './native-share.service';
import { PlatformService } from './platform.service';

declare const ensureTestBed: () => void;

class WebPlatformStub {
  runtime = 'web' as const;
  isNative = false;
  isWeb = true;
  isIOS = false;
  isAndroid = false;
  hasNativeShareSheet = false;
  usesWebPush = false;
  usesNativePush = false;
}

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      NativeShareService,
      { provide: PlatformService, useClass: WebPlatformStub },
    ],
  });
  return { svc: TestBed.inject(NativeShareService) };
}

describe('NativeShareService — web path', () => {
  let env = setup();
  beforeEach(() => {
    env = setup();
    // Reset both navigator.share and clipboard so each test wires
    // them exactly to its needs.
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('routes through navigator.share when the Web Share API is present', async () => {
    const spy = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: spy });

    const out = await env.svc.share({ title: 'Test', text: 'Hello', url: 'https://x.test' });

    expect(out.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith({
      title: 'Test',
      text: 'Hello',
      url: 'https://x.test',
    });
  });

  it('reports cancellations as non-error outcomes', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { throw Object.assign(new Error('user cancelled'), { name: 'AbortError' }); },
    });

    const out = await env.svc.share({ title: 'Test', url: 'https://x.test' });
    expect(out.ok).toBe(false);
    expect(out.cancelled).toBe(true);
    expect(out.error).toBeUndefined();
  });

  it('falls back to the clipboard when Web Share is missing', async () => {
    const write = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    });

    const out = await env.svc.share({ title: 'Test', url: 'https://x.test' });
    expect(out.ok).toBe(true);
    expect(write).toHaveBeenCalledWith('https://x.test');
  });

  it('returns `unsupported` when neither Share nor clipboard exist', async () => {
    const out = await env.svc.share({ title: 'Test' });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('unsupported');
  });
});
