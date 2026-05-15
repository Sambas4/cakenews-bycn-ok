import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Logger } from './logger.service';
import { ToastService } from './toast.service';
import { MonitoringService } from './monitoring.service';

/**
 * Last-resort handler for uncaught exceptions and rejected promises
 * that escape every other try/catch.
 *
 * Three responsibilities:
 *   1. **Forward to monitoring** — every uncaught error becomes a
 *      Sentry-style event so we don't fly blind in prod.
 *   2. **Console-log** through the {@link Logger} for dev visibility.
 *   3. **Surface a single short toast** to the user. We never leak
 *      stack traces, framework noise or DOM internals.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(Logger);
  private toast = inject(ToastService);
  private monitoring = inject(MonitoringService);

  handleError(error: unknown): void {
    this.logger.error('uncaught error', error);
    this.monitoring.captureError('uncaught', error);

    const msg = this.extractMessage(error);
    if (msg) this.toast.showToast(msg, 'error');
  }

  private extractMessage(err: unknown): string {
    if (!err) return '';
    if (typeof err === 'string') return err;
    const anyErr = err as { rejection?: unknown; name?: string; message?: string };
    // Skip noisy framework wrapper messages — they don't help users.
    if (anyErr.rejection) return this.extractMessage(anyErr.rejection);
    if (anyErr.name === 'AbortError') return '';
    if (anyErr.message?.includes('ChunkLoadError')) {
      return "Mise à jour disponible. Rechargez l'application.";
    }
    return 'Une erreur inattendue est survenue.';
  }
}
