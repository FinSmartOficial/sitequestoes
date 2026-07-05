/**
 * Recommendations — camada oficial (Fase 14E).
 * Centraliza RPCs `reco_*`.
 */
import { supabase } from "@/lib/supabase";

export type RecoItem = {
  id: string;
  ordem: number;
  tipo: "revisao" | "questoes" | "arena" | "tempo";
  titulo: string;
  descricao?: string;
  materia?: string;
  meta: number;
  unidade: string;
  prioridade: number;
  concluido: boolean;
};

export type RecoPlano = {
  id: string;
  user_id: string;
  data: string;
  itens: RecoItem[];
  meta: { questoes: number; minutos: number; arenas: number };
  analise: {
    precisao_30d: number;
    precisao_anterior: number;
    frequencia_7d: number;
    sequencia_dias: number;
    pontos_fracos: { materia: string; precisao: number; questoes: number; dias_sem_revisar: number }[];
    pontos_fortes: { materia: string; precisao: number; questoes: number }[];
    esquecidos: { materia: string; dias_sem_revisar: number; precisao: number }[];
    mensagens: { tipo: "positivo" | "atencao"; texto: string }[];
  };
  taxa_conclusao: number;
  concluido: boolean;
};

export type RecoConfig = {
  user_id: string;
  tempo_diario_min: number;
  dias_semana: number[];
  concurso: string | null;
  disciplinas_prioritarias: string[];
};

export async function fetchPlanoHoje(forcar = false): Promise<RecoPlano | null> {
  const { data, error } = await supabase.rpc("reco_gerar_plano_hoje", { p_forcar: forcar });
  if (error || !data) return null;
  return data as RecoPlano;
}

export async function marcarItem(itemId: string, concluido: boolean): Promise<RecoPlano | null> {
  const { data, error } = await supabase.rpc("reco_marcar_item", { p_item_id: itemId, p_concluido: concluido });
  if (error || !data) return null;
  return data as RecoPlano;
}

export async function fetchConfig(): Promise<RecoConfig | null> {
  const { data } = await supabase.rpc("reco_config_get");
  return (data as RecoConfig) ?? null;
}

export async function salvarConfig(c: Partial<RecoConfig>): Promise<RecoConfig | null> {
  const { data } = await supabase.rpc("reco_config_upsert", {
    p_tempo: c.tempo_diario_min ?? 60,
    p_dias: c.dias_semana ?? [1, 2, 3, 4, 5, 6, 0],
    p_concurso: c.concurso ?? null,
    p_prioritarias: c.disciplinas_prioritarias ?? [],
  });
  return (data as RecoConfig) ?? null;
}
