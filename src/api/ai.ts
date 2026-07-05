/**
 * Study Intelligence — camada oficial (Fase 21A/21B/21C).
 *
 * Camada de acesso às RPCs oficiais de IA de estudos publicadas no Supabase:
 *   - ai_study_insights
 *   - ai_study_diagnosis
 *   - ai_study_priorities
 *   - ai_study_recommendations
 *
 * Todas as chamadas passam por `callAiRpc`, que centraliza tratamento de
 * erro e normaliza retorno nulo.
 */
import { supabase } from "@/lib/supabase";

// ---------------- RPC registry ----------------

/**
 * Nomes canônicos das RPCs consumidas por este módulo. Restritos ao conjunto
 * de funções realmente existentes no schema tipado do Supabase.
 */
export const AI_RPC = {
  insights: "ai_study_insights",
  diagnosis: "ai_study_diagnosis",
  priorities: "ai_study_priorities",
  recommendations: "ai_study_recommendations",
} as const;

export type AiRpcName = (typeof AI_RPC)[keyof typeof AI_RPC];

/**
 * Interface interna de compatibilidade. Centraliza chamadas de RPC de IA,
 * padroniza tratamento de erro e valida retorno nulo devolvendo `fallback`.
 */
export async function callAiRpc<T>(
  name: AiRpcName,
  args: Record<string, unknown> | undefined,
  fallback: T,
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return (data ?? fallback) as T;
}


// ---------------- DTOs ----------------

/** Alerta/insight individual gerado pela análise de estudos. */
export interface StudyInsightDTO {
  readonly id: string;
  readonly tipo: "positivo" | "atencao" | "critico" | "info";
  readonly titulo: string;
  readonly descricao: string;
  readonly materia?: string | null;
  readonly metrica?: number | null;
  readonly unidade?: string | null;
  readonly criado_em: string;
}

/** Diagnóstico consolidado de desempenho do usuário. */
export interface StudyDiagnosisDTO {
  readonly precisao_geral: number;
  readonly precisao_30d: number;
  readonly precisao_anterior: number;
  readonly frequencia_7d: number;
  readonly sequencia_dias: number;
  readonly minutos_30d: number;
  readonly questoes_30d: number;
  readonly pontos_fortes: ReadonlyArray<{
    readonly materia: string;
    readonly precisao: number;
    readonly questoes: number;
  }>;
  readonly pontos_fracos: ReadonlyArray<{
    readonly materia: string;
    readonly precisao: number;
    readonly questoes: number;
    readonly dias_sem_revisar: number;
  }>;
  readonly esquecidos: ReadonlyArray<{
    readonly materia: string;
    readonly dias_sem_revisar: number;
    readonly precisao: number;
  }>;
  readonly atualizado_em: string;
}

/** Item priorizado pelo motor de recomendação. */
export interface StudyPriorityDTO {
  readonly id: string;
  readonly ordem: number;
  readonly materia: string;
  readonly assunto?: string | null;
  readonly motivo:
    | "baixa_precisao"
    | "esquecimento"
    | "frequencia_baixa"
    | "meta_diaria"
    | "revisao";
  readonly prioridade: number;
  readonly meta_questoes?: number | null;
  readonly meta_minutos?: number | null;
}

/** Recomendação executável apresentada ao usuário. */
export interface StudyRecommendationDTO {
  readonly id: string;
  readonly ordem: number;
  readonly tipo: "revisao" | "questoes" | "arena" | "tempo" | "diagnostico";
  readonly titulo: string;
  readonly descricao?: string | null;
  readonly materia?: string | null;
  readonly meta: number;
  readonly unidade: string;
  readonly prioridade: number;
  readonly concluido: boolean;
}

// ---------------- Fetchers ----------------

export function fetchStudyInsights(): Promise<StudyInsightDTO[]> {
  return callAiRpc<StudyInsightDTO[]>(AI_RPC.insights, undefined, []);
}

export function fetchStudyDiagnosis(): Promise<StudyDiagnosisDTO | null> {
  return callAiRpc<StudyDiagnosisDTO | null>(AI_RPC.diagnosis, undefined, null);
}

export function fetchStudyPriorities(): Promise<StudyPriorityDTO[]> {
  return callAiRpc<StudyPriorityDTO[]>(AI_RPC.priorities, undefined, []);
}

export function fetchStudyRecommendations(): Promise<StudyRecommendationDTO[]> {
  return callAiRpc<StudyRecommendationDTO[]>(AI_RPC.recommendations, undefined, []);
}
