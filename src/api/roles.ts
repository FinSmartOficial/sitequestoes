/**
 * Roles — verificação segura de papéis do usuário.
 * Fase 15: encapsula acesso à tabela `user_roles`.
 */
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "moderator" | "user";

export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}
