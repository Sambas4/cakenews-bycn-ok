import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Reads a Vite-injected env var safely (no crash if undefined). Trims
 * whitespace and strips accidental quotes that often slip in via CI secrets.
 */
function readEnv(key: string): string | undefined {
  try {
    const raw = (import.meta as any)?.env?.[key];
    if (typeof raw !== 'string') return undefined;
    const v = raw.trim().replace(/^["']|["']$/g, '');
    return v.length ? v : undefined;
  } catch { return undefined; }
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  public client: SupabaseClient;
  public readonly isConfigured: boolean;

  constructor() {
    const supabaseUrl = readEnv('VITE_SUPABASE_URL');
    const supabaseKey = readEnv('VITE_SUPABASE_ANON_KEY');
    this.isConfigured = Boolean(supabaseUrl && supabaseKey);

    if (!this.isConfigured) {
      // Fail loudly in dev. In prod we still build a client (to a dummy host)
      // so the app shell can render an error state instead of crashing the
      // whole bootstrap pipeline. The auth check will refuse to proceed.
      if ((import.meta as any)?.env?.MODE !== 'production') {
        console.error('[cake] Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
    }

    this.client = createClient(
      supabaseUrl ?? 'https://invalid.supabase.local',
      supabaseKey ?? 'anon-missing',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          // Throttle realtime events so a noisy table can't melt the device.
          params: { eventsPerSecond: 8 },
        },
      }
    );
  }
}
