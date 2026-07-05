/**
 * Calendar — camada oficial (Fase 14F).
 * Encapsula acesso à tabela `eventos` (agenda/calendário do usuário).
 */
import { supabase } from "@/lib/supabase";

export type TipoEvento = "Prova" | "Simulado" | "Prazo" | "Estudo";

export interface EventoAgenda {
  id: string;
  user_id: string;
  titulo: string;
  data: string;
  tipo: TipoEvento;
  observacao: string | null;
  created_at: string;
}

export type NovoEventoAgenda = Omit<Partial<EventoAgenda>, "id" | "user_id" | "created_at">;

export async function listEventos(userId: string): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventoAgenda[];
}

export async function insertEvento(userId: string, payload: NovoEventoAgenda): Promise<EventoAgenda> {
  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...(payload as Record<string, unknown>), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as EventoAgenda;
}

export async function deleteEvento(id: string): Promise<void> {
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) throw error;
}
