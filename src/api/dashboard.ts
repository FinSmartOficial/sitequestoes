/**
 * Camada de Dashboard — Fase 13.
 * Consome apenas RPCs oficiais do backend (Fase 5.4 / 9).
 * Nenhum cálculo de negócio deve ser feito no cliente.
 */
import { supabase } from "@/lib/supabase";

export interface DashboardSummary {
  respondidas_hoje: number;
  acertos_hoje: number;
  minutos_hoje: number;
  streak_dias: number;
  respondidas_semana: number;
  acertos_semana: number;
  minutos_semana: number;
  total_respondidas: number;
  total_acertos: number;
  taxa_acerto: number;
  raw: Record<string, unknown> | null;
}

export interface HeatmapCell {
  dia: string;
  questoes: number;
  minutos: number;
}

export interface DisciplineStat {
  disciplina_id: string;
  disciplina: string;
  respondidas: number;
  acertos: number;
  taxa: number;
}

export interface RankingPosition {
  slug: string;
  posicao: number | null;
  pontos: number;
  total: number;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  // Preferência: stats_dashboard_v2; fallback: stats_dashboard
  const v2 = await supabase.rpc("stats_dashboard_v2");
  const raw = (!v2.error && v2.data ? v2.data : null) as Record<string, unknown> | null
    ?? (await supabase.rpc("stats_dashboard")).data as Record<string, unknown> | null;

  const src = raw ?? {};
  const totalResp = toNumber(src.total_respondidas ?? src.respondidas_total);
  const totalAcertos = toNumber(src.total_acertos ?? src.acertos_total);
  return {
    respondidas_hoje: toNumber(src.respondidas_hoje ?? src.hoje_respondidas),
    acertos_hoje: toNumber(src.acertos_hoje ?? src.hoje_acertos),
    minutos_hoje: toNumber(src.minutos_hoje ?? src.hoje_minutos),
    streak_dias: toNumber(src.streak_dias ?? src.streak),
    respondidas_semana: toNumber(src.respondidas_semana ?? src.semana_respondidas),
    acertos_semana: toNumber(src.acertos_semana ?? src.semana_acertos),
    minutos_semana: toNumber(src.minutos_semana ?? src.semana_minutos),
    total_respondidas: totalResp,
    total_acertos: totalAcertos,
    taxa_acerto: totalResp > 0 ? totalAcertos / totalResp : 0,
    raw,
  };
}

export async function fetchHeatmap(): Promise<HeatmapCell[]> {
  const { data, error } = await supabase.rpc("stats_heatmap");
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: Record<string, unknown>) => ({
    dia: String(r.dia ?? r.data ?? ""),
    questoes: toNumber(r.questoes ?? r.total),
    minutos: toNumber(r.minutos),
  }));
}

export async function fetchByDiscipline(): Promise<DisciplineStat[]> {
  const { data, error } = await supabase.rpc("stats_by_discipline");
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: Record<string, unknown>) => {
    const resp = toNumber(r.respondidas ?? r.total);
    const acc = toNumber(r.acertos);
    return {
      disciplina_id: String(r.disciplina_id ?? r.id ?? ""),
      disciplina: String(r.disciplina ?? r.nome ?? "—"),
      respondidas: resp,
      acertos: acc,
      taxa: resp > 0 ? acc / resp : 0,
    };
  });
}

export async function fetchRankingPosition(slug: string): Promise<RankingPosition> {
  const { data, error } = await supabase.rpc("ranking_position", { _slug: slug });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    slug,
    posicao: src.posicao != null ? toNumber(src.posicao) : null,
    pontos: toNumber(src.pontos ?? src.xp),
    total: toNumber(src.total ?? src.participantes),
  };
}
