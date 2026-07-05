/**
 * Camada oficial de acesso ao domínio Simulados — Fase 14C.
 * Todo o frontend deve consumir estas funções (ou os hooks derivados
 * em `src/api/hooks.ts`) em vez de chamar `supabase` diretamente.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ============= DTOs =============

export interface SimulationFilters {
  materias?: string[];
  topicos?: string[];
  bancas?: string[];
  ano_min?: number;
  ano_max?: number;
  tipo?: "CE" | "MULTIPLA";
  apenas_erradas?: boolean;
  apenas_ineditas?: boolean;
}

export interface SimulationAnswerValue {
  ce?: boolean;
  idx?: number;
}

export interface SimulationQuestion {
  ordem: number;
  questao_id: string;
  tipo: "CE" | "MULTIPLA";
  enunciado: string;
  alternativas: string[] | null;
  materia: string;
  topico: string | null;
  banca: string | null;
  ano: number | null;
}

export interface SimulationAnswer {
  ordem: number;
  resposta: SimulationAnswerValue | null;
  correta: boolean | null;
  marcada_revisao: boolean;
  respondida_em: string | null;
}

export type SimulationStatus = "em_andamento" | "finalizado" | "cancelado";

export interface SimulationState {
  id: string;
  titulo: string;
  tipo: string;
  status: SimulationStatus;
  qtd: number;
  tempo_minutos: number;
  tempo_restante_segundos: number;
  questao_atual: number;
  iniciado_em: string;
  finalizado_em: string | null;
  resultado: Record<string, unknown> | null;
  questoes: SimulationQuestion[];
  respostas: SimulationAnswer[];
}

export interface SimulationSummary {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  qtd: number;
  tempo_minutos: number;
  created_at: string;
  finalizado_em: string | null;
  resultado: { acertos?: number; total?: number; precisao?: number } | null;
}

export interface SimulationReportItem {
  ordem: number;
  materia: string;
  topico: string | null;
  banca: string | null;
  ano: number | null;
  enunciado: string;
  alternativas: string[] | null;
  tipo: "CE" | "MULTIPLA";
  gabarito_ce: boolean | null;
  gabarito_idx: number | null;
  comentario: string | null;
  explicacao: string | null;
  resposta: SimulationAnswerValue | null;
  correta: boolean | null;
  tempo_segundos: number;
  marcada_revisao: boolean;
}

export interface SimulationResult {
  acertos: number;
  erros: number;
  branco: number;
  total: number;
  precisao: number;
  pontuacao: number;
  tempo_total_segundos: number;
  tempo_medio_segundos: number;
  por_materia: Record<
    string,
    { total: number; acertos: number; erros: number; branco: number }
  >;
}

export interface SimulationReport {
  simulado: {
    id: string;
    titulo: string;
    qtd: number;
    tempo_minutos: number;
    status: string;
    finalizado_em: string;
    iniciado_em: string;
    resultado: SimulationResult;
  };
  itens: SimulationReportItem[];
  analise: {
    melhor_disciplina: string | null;
    pior_disciplina: string | null;
    tempo_medio_segundos: number;
    precisao: number;
    sugestao: string;
  };
}

// ============= Queries =============

export async function listHistorico(limit = 50): Promise<SimulationSummary[]> {
  const { data, error } = await supabase.rpc("simulado_historico", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as SimulationSummary[];
}

export async function getEstado(simId: string): Promise<SimulationState> {
  const { data, error } = await supabase.rpc("simulado_estado", { _sim_id: simId });
  if (error) throw error;
  return data as SimulationState;
}

export async function getRelatorio(simId: string): Promise<SimulationReport> {
  const { data, error } = await supabase.rpc("simulado_relatorio", { _sim_id: simId });
  if (error) throw error;
  return data as SimulationReport;
}

export async function listMaterias(): Promise<string[]> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select("materia")
    .not("materia", "is", null)
    .limit(1000);
  if (error) throw error;
  return Array.from(
    new Set((data ?? []).map((r: { materia: string }) => r.materia)),
  ).sort();
}

export async function listBancas(): Promise<string[]> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select("banca")
    .not("banca", "is", null)
    .limit(1000);
  if (error) throw error;
  return Array.from(
    new Set((data ?? []).map((r: { banca: string }) => r.banca)),
  ).sort();
}

// ============= Mutations =============

export interface CreateSimulationInput {
  tipo: string;
  titulo: string;
  filtros: SimulationFilters;
  qtd: number;
  tempo_minutos: number;
}

export async function criarSimulado(input: CreateSimulationInput): Promise<string> {
  const { data, error } = await supabase.rpc("simulado_criar", {
    _tipo: input.tipo,
    _titulo: input.titulo,
    _filtros: input.filtros,
    _qtd: input.qtd,
    _tempo_minutos: input.tempo_minutos,
  });
  if (error) throw error;
  return data as string;
}

export async function responder(
  simId: string,
  ordem: number,
  resposta: SimulationAnswerValue,
  tempoSegundos: number,
): Promise<void> {
  const { error } = await supabase.rpc("simulado_responder", {
    _sim_id: simId,
    _ordem: ordem,
    _resposta: resposta,
    _tempo_segundos: tempoSegundos,
  });
  if (error) throw error;
}

export async function marcarRevisao(
  simId: string,
  ordem: number,
  marcada: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("simulado_marcar_revisao", {
    _sim_id: simId,
    _ordem: ordem,
    _marcada: marcada,
  });
  if (error) throw error;
}

export async function autosave(
  simId: string,
  questaoAtual: number,
  tempoRestante: number,
): Promise<void> {
  await supabase.rpc("simulado_autosave", {
    _sim_id: simId,
    _questao_atual: questaoAtual,
    _tempo_restante: tempoRestante,
  });
}

export async function finalizar(simId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc("simulado_finalizar", { _sim_id: simId });
  if (error) throw error;
  return data;
}

export async function cancelar(simId: string): Promise<void> {
  const { error } = await supabase.rpc("simulado_cancelar", { _sim_id: simId });
  if (error) throw error;
}

// ============= Helpers puros (sem backend) =============

export function formatarTempo(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cronômetro regressivo persistente. Client-side apenas.
 * Chama `onAutosave` a cada 5s enquanto ativo; chama `onTimeout` ao zerar.
 */
export function useCronometro(
  tempoInicialSegundos: number,
  ativo: boolean,
  onAutosave?: (segRestantes: number) => void,
  onTimeout?: () => void,
): number {
  const [segundos, setSegundos] = useState(tempoInicialSegundos);
  const segRef = useRef(tempoInicialSegundos);
  const timeoutRef = useRef(onTimeout);
  const saveRef = useRef(onAutosave);

  useEffect(() => {
    segRef.current = tempoInicialSegundos;
    setSegundos(tempoInicialSegundos);
  }, [tempoInicialSegundos]);

  useEffect(() => {
    timeoutRef.current = onTimeout;
    saveRef.current = onAutosave;
  });

  useEffect(() => {
    if (!ativo) return;
    let count = 0;
    const t = setInterval(() => {
      segRef.current = Math.max(0, segRef.current - 1);
      setSegundos(segRef.current);
      count++;
      if (count % 5 === 0) saveRef.current?.(segRef.current);
      if (segRef.current <= 0) {
        clearInterval(t);
        timeoutRef.current?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [ativo]);

  return segundos;
}
