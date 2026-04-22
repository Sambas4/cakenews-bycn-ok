
import { createClient } from '@supabase/supabase-js';

// Gestion sécurisée des variables d'environnement pour éviter les crashs runtime
// si import.meta.env n'est pas défini dans l'environnement actuel.
const getEnv = (key: string) => {
  // 1. Essayer import.meta.env (Vite)
  // Utilisation du chaining optionnel (?.) pour la sécurité
  const viteEnv = (import.meta as any)?.env;
  if (viteEnv && viteEnv[key]) {
    return viteEnv[key];
  }

  // 2. Essayer process.env (Fallback pour environnements Node/CRA/WebContainer)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // process n'est pas disponible
  }

  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Si les clés ne sont pas là, on ne crée pas le client (Mode Mock actif)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
