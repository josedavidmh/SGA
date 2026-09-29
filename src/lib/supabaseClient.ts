import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lectura ultra segura de variables de entorno (compatible con Vite cliente y Node)
const getEnvVar = (key: string): string => {
  try {
    let raw = '';
    if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) {
      raw = (import.meta as any).env[key] || '';
    } else if (typeof process !== 'undefined' && process && process.env) {
      raw = process.env[key] || '';
    }
    // Sanitizar quitando comillas dobles o simples accidentales y espacios
    return String(raw).replace(/^["']|["']$/g, '').trim();
  } catch {
    return '';
  }
};

// Formateador inteligente: acepta "iuhorvnokxwhtuhrywad", "iuhorvnokxwhtuhrywad.supabase.co" o "https://iuhorvnokxwhtuhrywad.supabase.co"
export const formatSupabaseUrl = (val: string): string => {
  let clean = String(val || '').replace(/^["']|["']$/g, '').trim();
  if (!clean || clean.includes('tu-proyecto') || clean.includes('placeholder')) return '';
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    if (clean.includes('.supabase.co')) {
      clean = `https://${clean}`;
    } else {
      clean = `https://${clean}.supabase.co`;
    }
  }
  return clean;
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const formattedSupabaseUrl = formatSupabaseUrl(rawUrl) || 'https://iuhorvnokxwhtuhrywad.supabase.co';

export const formattedSupabaseAnonKey = (
  rawKey ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aG9ydm5va3h3aHR1aHJ5d2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjY4MjEsImV4cCI6MjEwNTI0MjgyMX0.-Vl4ojTIPL-k_vqbrP0ID16GBVi5eh-aMm4LCYWnDU8'
).replace(/^["']|["']$/g, '').trim();

export const isSupabaseConfigured = Boolean(
  formattedSupabaseUrl && 
  formattedSupabaseAnonKey && 
  formattedSupabaseAnonKey.length > 20 &&
  !formattedSupabaseAnonKey.includes('placeholder')
);

// Fallbacks seguros
const finalUrl = formattedSupabaseUrl;
const finalKey = formattedSupabaseAnonKey;

export const supabase: SupabaseClient = createClient(finalUrl, finalKey);
