/**
 * Settings — camada oficial (Fase 14F).
 * Centraliza operações de conta/preferências: troca de senha e limpeza
 * de dados. Preferências locais (tema, notificações, som) permanecem em
 * `localStorage` via `usePersistedState`, sem tocar no backend.
 */
import { supabase } from "@/lib/supabase";

const TABELAS_USUARIO = [
  "questoes",
  "sessoes_estudo",
  "simulado_resultados",
  "eventos",
  "grade_semanal",
] as const;

export async function updatePassword(novaSenha: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

export async function purgeUserData(userId: string): Promise<void> {
  for (const t of TABELAS_USUARIO) {
    await supabase.from(t).delete().eq("user_id", userId);
  }
}
