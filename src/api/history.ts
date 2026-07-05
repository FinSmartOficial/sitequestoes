/**
 * History — camada oficial (Fase 14F).
 * Encapsula acesso à tabela `sessoes_estudo` (histórico de estudo).
 */
import { supabase } from "@/lib/supabase";

export interface SessaoEstudo {
  id: string;
  user_id: string;
  data: string;
  minutos: number;
  materia: string;
  questoes_total: number;
  questoes_acertos: number;
  observacao: string | null;
  created_at: string;
}

export type NovaSessaoEstudo = Omit<Partial<SessaoEstudo>, "id" | "user_id" | "created_at">;

export async function listSessoes(userId: string, orderAsc = false): Promise<SessaoEstudo[]> {
  const { data, error } = await supabase
    .from("sessoes_estudo")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: orderAsc });
  if (error) throw error;
  return (data ?? []) as SessaoEstudo[];
}

export async function insertSessao(userId: string, payload: NovaSessaoEstudo): Promise<SessaoEstudo> {
  const { data, error } = await supabase
    .from("sessoes_estudo")
    .insert({ ...(payload as Record<string, unknown>), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SessaoEstudo;
}

export async function deleteSessao(id: string): Promise<void> {
  const { error } = await supabase.from("sessoes_estudo").delete().eq("id", id);
  if (error) throw error;
}
