/**
 * Gamificação — Fase 13 / Turno 4.
 * Fonte única: RPCs oficiais do backend.
 * Nenhum cálculo de XP, nível ou progressão é feito no cliente.
 */
import { supabase } from "@/lib/supabase";

export interface MissionDTO {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  periodo: "diaria" | "semanal" | "mensal" | "permanente";
  metrica: string;
  objetivo: number;
  progresso: number;
  concluida: boolean;
  resgatada: boolean;
  xp: number;
  raridade: "comum" | "rara" | "epica" | "lendaria" | "mitica";
  icone: string | null;
  ordem: number;
  ciclo: string;
}

export interface AchievementDTO {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  raridade: "bronze" | "prata" | "ouro" | "platina" | "diamante" | "mestre" | "lendario";
  xp: number;
  progresso: number;
  objetivo: number;
  concluida: boolean;
  desbloqueada: boolean;
  desbloqueada_em: string | null;
  icone: string | null;
}

export interface RewardHistoryEntry {
  id: string;
  tipo: string;
  origem: string | null;
  titulo: string;
  xp: number;
  criado_em: string;
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ─── Missions ───────────────────────────────────────────────────────────────

export async function listMissions(): Promise<MissionDTO[]> {
  // Preferência: missions_list (novo); fallback: missoes_listar (legado).
  const modern = await supabase.rpc("missions_list");
  const rows = (!modern.error && modern.data
    ? modern.data
    : (await supabase.rpc("missoes_listar")).data) as unknown;
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  return list.map((r) => ({
    id: String(r.id),
    codigo: String(r.codigo ?? r.id),
    titulo: String(r.titulo ?? ""),
    descricao: String(r.descricao ?? ""),
    periodo: (r.periodo ?? r.tipo ?? "diaria") as MissionDTO["periodo"],
    metrica: String(r.metrica ?? ""),
    objetivo: num(r.objetivo),
    progresso: num(r.progresso),
    concluida: Boolean(r.concluida),
    resgatada: Boolean(r.resgatada),
    xp: num(r.xp),
    raridade: (r.raridade ?? "comum") as MissionDTO["raridade"],
    icone: (r.icone as string) ?? null,
    ordem: num(r.ordem),
    ciclo: String(r.ciclo ?? ""),
  }));
}

export async function claimMission(missionId: string): Promise<{ xp_concedido: number; xp_total: number }> {
  // Preferência: mission_claim; fallback: missoes_resgatar.
  let res = await supabase.rpc("mission_claim", { p_missao: missionId });
  if (res.error) res = await supabase.rpc("missoes_resgatar", { p_missao: missionId });
  if (res.error) throw res.error;
  const d = (res.data ?? {}) as Record<string, unknown>;
  return { xp_concedido: num(d.xp_concedido ?? d.xp), xp_total: num(d.xp_total) };
}

// ─── Achievements ───────────────────────────────────────────────────────────

export async function listAchievements(): Promise<AchievementDTO[]> {
  const modern = await supabase.rpc("achievements_list");
  const rows = (!modern.error && modern.data
    ? modern.data
    : (await supabase.rpc("conquistas_listar")).data) as unknown;
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  return list.map((r) => ({
    id: String(r.id),
    codigo: String(r.codigo ?? r.id),
    titulo: String(r.titulo ?? ""),
    descricao: String(r.descricao ?? ""),
    categoria: String(r.categoria ?? ""),
    raridade: (String(r.raridade ?? "bronze") as AchievementDTO["raridade"]),
    xp: num(r.xp),
    progresso: num(r.progresso),
    objetivo: num(r.objetivo, 1),
    concluida: Boolean(r.concluida ?? r.desbloqueada),
    desbloqueada: Boolean(r.desbloqueada),
    desbloqueada_em: (r.desbloqueada_em as string) ?? null,
    icone: (r.icone as string) ?? null,
  }));
}

export async function claimAchievement(achievementId: string): Promise<{ xp_concedido: number }> {
  let res = await supabase.rpc("achievement_unlock", { p_achievement: achievementId });
  if (res.error) res = await supabase.rpc("conquistas_resgatar", { p_conquista: achievementId });
  if (res.error) throw res.error;
  const d = (res.data ?? {}) as Record<string, unknown>;
  return { xp_concedido: num(d.xp_concedido ?? d.xp) };
}

// ─── Reward history ─────────────────────────────────────────────────────────

export async function listRewardHistory(limit = 50): Promise<RewardHistoryEntry[]> {
  const { data, error } = await supabase.rpc("historico_recompensas", { p_limit: limit });
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r) => ({
    id: String(r.id ?? crypto.randomUUID()),
    tipo: String(r.tipo ?? "xp"),
    origem: (r.origem as string) ?? null,
    titulo: String(r.titulo ?? r.descricao ?? "Recompensa"),
    xp: num(r.xp ?? r.valor),
    criado_em: String(r.criado_em ?? r.created_at ?? new Date().toISOString()),
  }));
}

// ─── Conquistas (formato raw v3, usado por useProgressao) ───────────────────

export interface ConquistaRawRow {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  metrica: string;
  categoria: string;
  objetivo: number;
  progresso: number;
  concluida: boolean;
  desbloqueada: boolean;
  xp: number;
  raridade: "bronze" | "prata" | "ouro" | "platina" | "diamante" | "mestre" | "lendario";
  ordem: number;
  desbloqueada_em: string | null;
}

export async function listConquistasRaw(): Promise<ConquistaRawRow[]> {
  const { data, error } = await supabase.rpc("conquistas_listar");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as ConquistaRawRow[];
}

export interface ResgatarConquistaResult {
  ok: boolean;
  xp_concedido: number;
  xp_total: number;
}

export async function resgatarConquista(conquistaId: string): Promise<ResgatarConquistaResult> {
  const { data, error } = await supabase.rpc("conquistas_resgatar", { p_conquista: conquistaId });
  if (error) throw error;
  return data as ResgatarConquistaResult;
}
