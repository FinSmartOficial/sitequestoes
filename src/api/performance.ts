/**
 * Performance — camada oficial (Fase 14E).
 * Centraliza a RPC `desempenho_resumo`.
 */
import { supabase } from "@/lib/supabase";

export interface DesempenhoResumo {
  questoes: number;
  acertos: number;
  erros: number;
  taxa: number;
  minutos: number;
  simulados: number;
  streak: number;
  xp: number;
  xp_total: number;
  nivel: number;
  liga: string;
  missoes_concluidas: number;
  conquistas_desbloqueadas: number;
}

export async function fetchDesempenhoResumo(): Promise<DesempenhoResumo> {
  const { data, error } = await supabase.rpc("desempenho_resumo");
  if (error) throw error;
  return (data ?? {}) as DesempenhoResumo;
}
