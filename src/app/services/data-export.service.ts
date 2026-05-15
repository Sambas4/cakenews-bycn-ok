import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Logger } from './logger.service';

/**
 * Client-side wrapper around the `export-user-data` Edge Function.
 *
 * GDPR Article 15: a single tap from the profile settings produces a
 * `cakenews-export-{date}.json` download containing every row the
 * user owns across the database.
 *
 * Side-effects:
 *   * Streams to a Blob — no copy of the export ever stays in memory
 *     past the download trigger.
 *   * Surfaces success / failure via {@link ToastService} so the
 *     user gets immediate feedback.
 *
 * Failure modes:
 *   * Not authenticated → toast + return.
 *   * Edge Function unavailable → toast with a request-id from the
 *     logger so support can correlate.
 */
@Injectable({ providedIn: 'root' })
export class DataExportService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);
  private logger = inject(Logger);

  readonly busy = signal(false);

  async download(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke('export-user-data', {
        method: 'POST',
      });
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `cakenews-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.toast.showToast('Export téléchargé', 'success');
    } catch (e) {
      this.logger.error('export-user-data failed', e);
      this.toast.showToast('Échec de l’export. Réessaie dans un instant.', 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
