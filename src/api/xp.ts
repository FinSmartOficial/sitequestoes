/**
 * XP / Progressão — Fase 13 / Turno 4.
 * Toda derivação de nível/liga é feita pelo backend.
 */
import { supabase } from "@/lib/supabase";

export interface XpSummary {
  xp_total: number;
  xp_atual: number;
  nivel: number;
  liga: string;
  xp_para_proximo_nivel: number;
  xp_do_nivel: number;
  progresso: number; // 0..1
}

export interface XpProgressStep {
  nivel: number;
  xp_necessario: number;
  liga: string;
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export async function fetchXpSummary(): Promise<XpSummary> {
  const { data, error } = await supabase.rpc("xp_summary");
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  const total = num(src.xp_total ?? src.xp);
  const doNivel = num(src.xp_do_nivel);
  const paraProx = num(src.xp_para_proximo_nivel ?? src.xp_proximo, 1);
  const atual = num(src.xp_atual ?? (total - doNivel));
  return {
    xp_total: total,
    xp_atual: atual,
    nivel: num(src.nivel, 1),
    liga: String(src.liga ?? "Bronze"),
    xp_para_proximo_nivel: paraProx,
    xp_do_nivel: doNivel,
    progresso: paraProx > 0 ? Math.min(1, atual / paraProx) : 0,
  };
}

export async function fetchXpProgress(): Promise<XpProgressStep[]> {
  const { data, error } = await supabase.rpc("xp_progressao");
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r) => ({
    nivel: num(r.nivel),
    xp_necessario: num(r.xp_necessario ?? r.xp_acumulado),
    liga: String(r.liga ?? ""),
  }));
}
