'use client';

import { createClient } from '@supabase/supabase-js';

// Cliente exclusivo das telas administrativas. Diferentemente do catálogo
// público, precisa manter a sessão de login no navegador.
// A chave publishable é pública; as regras RLS continuam obrigatórias.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const adminConfigured = Boolean(url && publishableKey);

export const adminSupabase = createClient(url || 'https://configuration-missing.invalid', publishableKey || 'configuration-missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
