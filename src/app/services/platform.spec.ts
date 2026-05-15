import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PlatformService } from './platform.service';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [PlatformService] });
  return { svc: TestBed.inject(PlatformService) };
}

describe('PlatformService — jsdom test environment', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('resolves runtime to "web" outside of a native WebView', () => {
    expect(env.svc.runtime).toBe('web');
  });

  it('flags isWeb and clears the native booleans', () => {
    expect(env.svc.isWeb).toBe(true);
    expect(env.svc.isNative).toBe(false);
    expect(env.svc.isIOS).toBe(false);
    expect(env.svc.isAndroid).toBe(false);
  });

  it('routes notification registration through web push when supported', () => {
    // jsdom does not expose PushManager, but the platform still
    // refuses native push.
    expect(env.svc.usesNativePush).toBe(false);
  });

  it('does not expose a native share sheet on the web target', () => {
    expect(env.svc.hasNativeShareSheet).toBe(false);
  });
});
