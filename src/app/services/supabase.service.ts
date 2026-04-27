import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    // Les variables d'environnement Supabase doivent être ajoutées dans les paramètres
    const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] || 'https://dummy.supabase.co';
    const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] || 'dummy-key';

    if (supabaseUrl === 'https://dummy.supabase.co') {
      console.warn("⚠️ Supabase URL ou clé non définie ! Veuillez les configurer l'environnement.");
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }
}
