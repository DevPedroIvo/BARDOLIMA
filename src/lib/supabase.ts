import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retorna as credenciais públicas oficiais do Supabase (URL e VITE_SUPABASE_ANON_KEY)
export const getSupabaseCredentials = () => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let localUrl = '';
  let localKey = '';

  if (typeof window !== 'undefined') {
    try {
      localUrl = (localStorage.getItem('distribuidora_supabase_url') || '').trim();
      localKey = (localStorage.getItem('distribuidora_supabase_anon_key') || '').trim();

      // Expurgar credenciais do projeto antigo caso estejam salvas no navegador
      if (localUrl.includes('vyfzhviihklhbuuawsxx') || localUrl.includes('eqjmdbykfxnvoyypkmnl')) {
        localStorage.removeItem('distribuidora_supabase_url');
        localStorage.removeItem('distribuidora_supabase_anon_key');
        localUrl = '';
        localKey = '';
      }

      // Expurgar incondicionalmente qualquer Secret API Key armazenada no localStorage
      if (localKey.toLowerCase().includes('secret')) {
        localStorage.removeItem('distribuidora_supabase_anon_key');
        localKey = '';
      }
    } catch (e) {}
  }

  const supabaseUrl = localUrl || envUrl || 'https://ddncstcdmmdyukuvfvav.supabase.co';
  let supabaseAnonKey = localKey || envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbmNzdGNkbW1keXVrdXZmdmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NDE3NjEsImV4cCI6MjExMDUxNzc2MX0.Da_L8-SPZ2UZNmJqp2ndli40mCak897Ozg06ntozw2I';

  // Bloquear e zerar incondicionalmente qualquer Secret API Key caso esteja configurada
  if (supabaseAnonKey.toLowerCase().includes('secret')) {
    supabaseAnonKey = '';
  }

  return { supabaseUrl, supabaseAnonKey };
};

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (): SupabaseClient => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

  if (!cachedClient || cachedUrl !== supabaseUrl || cachedKey !== supabaseAnonKey) {
    cachedUrl = supabaseUrl;
    cachedKey = supabaseAnonKey;
    cachedClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  return cachedClient;
};

// Proxy export para garantir chamadas dinâmicas ao cliente Supabase
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export const isSupabaseConfigured = (): boolean => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    !supabaseAnonKey.toLowerCase().includes('secret')
  );
};
