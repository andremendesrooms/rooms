import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha alto e cedo em vez de deixar toda página quebrar silenciosamente
  // com erros de rede confusos.
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados. ' +
      'Copie .env.local.example para .env.local e preencha os valores do seu projeto.'
  );
}

// Cliente único, seguro para uso tanto em Server Components quanto em
// Client Components: usa só a anon key, e toda proteção real vem das
// policies de RLS já configuradas no banco (anon só enxerga `properties_public`
// e o que as policies explicitamente liberam).
export const supabase = createClient(supabaseUrl || 'https://configuration-missing.invalid', supabaseAnonKey || 'configuration-missing', {
  auth: { persistSession: false },
});
