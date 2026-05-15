import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Milliseconds to display before auto-dismiss. */
  ttlMs: number;
}

const DEFAULT_TTL: Record<ToastType, number> = {
  info: 3000,
  success: 2500,
  warning: 4000,
  error: 5000,
};

let toastSeq = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  showToast(message: string, type: ToastType = 'info', ttlMs?: number) {
    const id = `t-${Date.now()}-${++toastSeq}`;
    const ttl = ttlMs ?? DEFAULT_TTL[type];
    this.toasts.update(curr => [...curr, { id, message, type, ttlMs: ttl }]);
    setTimeout(() => this.removeToast(id), ttl);
  }

  removeToast(id: string) {
    this.toasts.update(curr => curr.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
