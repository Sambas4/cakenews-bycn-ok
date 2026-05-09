import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Logger } from './logger.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied';

/**
 * Encapsulates the Web Push permission lifecycle.
 *
 * Why a service:
 *  - Asking for push permission *immediately* on first load is one of
 *    the worst UX antipatterns; we let the UI decide *when* to call
 *    {@link request} (e.g. after the user opts into a digest).
 *  - The Web Push and Notification APIs are split. We hide that here
 *    and expose a single `status()` signal.
 *  - Subscribing requires a VAPID public key. We accept it lazily so
 *    a deployment without a configured Edge Function still gets the
 *    permission UX without crashing on `applicationServerKey`.
 */
/**
 * Read the build-time VAPID public key. We treat the empty string as
 * "push is not configured for this deployment" so the rest of the
 * code stays graceful in dev environments.
 */
function readVapidKey(): string {
  try {
    const v = (import.meta as { env?: Record<string, string> }).env?.['VITE_VAPID_PUBLIC_KEY'];
    return typeof v === 'string' ? v.trim() : '';
  } catch { return ''; }
}

@Injectable({ providedIn: 'root' })
export class PushPermissionService {
  private logger = inject(Logger);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private readonly vapidKey = readVapidKey();
  private autoSubscribeAttempted = false;

  /** Current notification permission as a typed signal. */
  readonly status = signal<PushStatus>(this.detect());

  readonly canPrompt = computed(() => this.status() === 'default');

  constructor() {
    // When permission is `granted` and the viewer is signed in, keep
    // a Supabase subscription row registered for this device. Idempotent
    // — safe to fire repeatedly (subscribe() returns the existing sub
    // if one is already in place).
    effect(() => {
      const status = this.status();
      const user = this.auth.currentUser();
      if (status !== 'granted' || !user || this.autoSubscribeAttempted) return;
      this.autoSubscribeAttempted = true;
      void this.persistSubscription(user.id);
    });
  }

  /** Best-effort request flow. Returns the resolved status. */
  async request(): Promise<PushStatus> {
    if (this.status() !== 'default') return this.status();
    if (typeof Notification === 'undefined') {
      this.status.set('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      const next = this.normalise(result);
      this.status.set(next);
      // If the user just granted permission, eagerly persist the
      // subscription rather than waiting for the auth effect to
      // re-fire on a future cycle.
      const uid = this.auth.currentUser()?.id;
      if (next === 'granted' && uid) {
        this.autoSubscribeAttempted = true;
        void this.persistSubscription(uid);
      }
      return next;
    } catch (e) {
      this.logger.warn('push permission request failed', e);
      return this.status();
    }
  }

  /**
   * Subscribe to push with the given VAPID public key. Idempotent —
   * returns the existing subscription if one is already registered.
   * Returns `null` when the platform doesn't support push or when the
   * permission isn't granted yet.
   */
  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (this.status() !== 'granted') return null;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) return existing;
      // The DOM `BufferSource` definition requires an ArrayBuffer-
      // backed view; we slice into a fresh ArrayBuffer to avoid the
      // narrower SharedArrayBuffer type the TS lib infers.
      const key = this.urlBase64ToUint8Array(vapidPublicKey);
      const buffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: buffer,
      });
    } catch (e) {
      this.logger.warn('push subscribe failed', e);
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Best-effort prune of the server-side row. We `delete` by
        // endpoint instead of by user_uid so we never wipe other
        // devices the user may have authorised on the same account.
        await this.supabase.client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    } catch (e) {
      this.logger.warn('push unsubscribe failed', e);
    }
  }

  /**
   * Persist the device's PushSubscription into Supabase so the
   * `send-push` Edge Function can reach this user. Called automatically
   * on login when permission is already `granted`. Idempotent.
   */
  private async persistSubscription(uid: string): Promise<void> {
    if (!this.vapidKey) return;                     // deployment without push
    const sub = await this.subscribe(this.vapidKey);
    if (!sub) return;
    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.['p256dh'];
    const auth = json.keys?.['auth'];
    if (!endpoint || !p256dh || !auth) return;

    try {
      await this.supabase.client.from('push_subscriptions').upsert(
        {
          user_uid: uid,
          endpoint,
          p256dh,
          auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
        { onConflict: 'user_uid,endpoint' }
      );
    } catch (e) {
      this.logger.warn('push subscription persist failed', e);
    }
  }

  // ────────────────────────────────────────────────────────────────

  private detect(): PushStatus {
    if (typeof Notification === 'undefined') return 'unsupported';
    return this.normalise(Notification.permission);
  }

  private normalise(p: NotificationPermission): PushStatus {
    if (p === 'granted') return 'granted';
    if (p === 'denied') return 'denied';
    return 'default';
  }

  /**
   * Decode a URL-safe base64 VAPID key into the binary form the
   * PushManager expects. Tiny helper, dependency-free.
   */
  private urlBase64ToUint8Array(b64: string): Uint8Array {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4);
    const normalised = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(normalised);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
}
