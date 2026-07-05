import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase apontando EXCLUSIVAMENTE para o projeto oficial do usuário.
 * Não utiliza Lovable Cloud, proxies *.lovable.cloud, nem Project ID do Lovable.
 *
 * A chave publishable (sb_publishable_*) é pública por design — segura no frontend.
 * A segurança dos dados é garantida pelas policies de RLS no Supabase.
 */
const SUPABASE_URL = "https://ptuauamkfneaplkpeiaf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5WqTQpHAO6zjX3msqqsfNQ_TkNJx0uM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
