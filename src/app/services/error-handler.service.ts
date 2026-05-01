import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Logger } from './logger.service';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(Logger);
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    this.logger.error('uncaught error', error);

    // Surface a single user-facing message; never leak technical details.
    const msg = this.extractMessage(error);
    if (msg) this.toast.showToast(msg, 'error');
  }

  private extractMessage(err: unknown): string {
    if (!err) return '';
    if (typeof err === 'string') return err;
    const anyErr = err as any;
    // Skip noisy framework wrapper messages — they don't help users.
    if (anyErr?.rejection) return this.extractMessage(anyErr.rejection);
    if (anyErr?.name === 'AbortError') return '';
    if (anyErr?.message?.includes?.('ChunkLoadError')) {
      return "Mise à jour disponible. Rechargez l'application.";
    }
    return 'Une erreur inattendue est survenue.';
  }
}
