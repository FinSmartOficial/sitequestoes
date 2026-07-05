/**
 * Rankings — Fase 13 / Turno 4 (extendido na Fase 15).
 * Fonte única: snapshots do backend via RPCs `ranking_*` / `league_status` / `season_status`.
 * Nenhuma ordenação, agregação ou cálculo de posição é feito no cliente.
 */
import { supabase } from "@/lib/supabase";
import { getUser } from "./auth";

export interface RankingRowDTO {
  posicao: number;
  valor: number;
  user_id: string;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  estado: string | null;
  cidade: string | null;
  liga: string | null;
  nivel: number | null;
}

export interface RankingPositionDTO {
  slug: string;
  posicao: number | null;
  valor: number;
  total: number;
}

export interface LeagueStatusDTO {
  liga: string;
  pontos: number;
  posicao: number | null;
  total: number;
  proxima_liga: string | null;
  pontos_para_promocao: number;
  fim_em: string | null;
  raw: Record<string, unknown> | null;
}

export interface SeasonStatusDTO {
  temporada: string | null;
  inicio: string | null;
  fim: string | null;
  dias_restantes: number;
  raw: Record<string, unknown> | null;
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function toRow(r: Record<string, unknown>, fallbackPos: number): RankingRowDTO {
  return {
    posicao: num(r.posicao, fallbackPos),
    valor: num(r.valor ?? r.pontos ?? r.xp),
    user_id: String(r.user_id ?? r.id),
    nome: (r.nome as string) ?? null,
    username: (r.username as string) ?? null,
    avatar_url: (r.avatar_url as string) ?? null,
    estado: (r.estado as string) ?? null,
    cidade: (r.cidade as string) ?? null,
    liga: (r.liga as string) ?? null,
    nivel: (r.nivel as number) ?? null,
  };
}

export async function fetchRankingTop(slug: string, limit = 100): Promise<RankingRowDTO[]> {
  const { data, error } = await supabase.rpc("ranking_top", { _slug: slug, _limit: limit });
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r, i) => toRow(r, i + 1));
}

export async function fetchRankingNearby(slug: string, radius = 5): Promise<RankingRowDTO[]> {
  const { data, error } = await supabase.rpc("ranking_nearby", { _slug: slug, _radius: radius });
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r, i) => toRow(r, i + 1));
}

export async function fetchRankingPosition(slug: string): Promise<RankingPositionDTO> {
  const { data, error } = await supabase.rpc("ranking_position", { _slug: slug });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    slug,
    posicao: src.posicao != null ? num(src.posicao) : null,
    valor: num(src.valor ?? src.pontos ?? src.xp),
    total: num(src.total ?? src.participantes),
  };
}

export async function fetchRankingHistory(slug: string, limit = 30): Promise<Array<{ dia: string; posicao: number; valor: number }>> {
  const { data, error } = await supabase.rpc("ranking_history", { _slug: slug, _limit: limit });
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r) => ({
    dia: String(r.dia ?? r.data ?? ""),
    posicao: num(r.posicao),
    valor: num(r.valor ?? r.pontos),
  }));
}

export async function searchRankingUsers(slug: string, q: string, limit = 20): Promise<RankingRowDTO[]> {
  const { data, error } = await supabase.rpc("ranking_search", { _slug: slug, _q: q, _limit: limit });
  if (error) throw error;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return list.map((r, i) => toRow(r, i + 1));
}

export async function fetchLeagueStatus(): Promise<LeagueStatusDTO> {
  const { data, error } = await supabase.rpc("league_status");
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    liga: String(src.liga ?? "Bronze"),
    pontos: num(src.pontos ?? src.liga_pontos),
    posicao: src.posicao != null ? num(src.posicao) : null,
    total: num(src.total),
    proxima_liga: (src.proxima_liga as string) ?? null,
    pontos_para_promocao: num(src.pontos_para_promocao),
    fim_em: (src.fim_em as string) ?? null,
    raw: src,
  };
}

export async function fetchSeasonStatus(): Promise<SeasonStatusDTO> {
  const { data, error } = await supabase.rpc("season_status");
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    temporada: (src.temporada as string) ?? (src.nome as string) ?? null,
    inicio: (src.inicio as string) ?? null,
    fim: (src.fim as string) ?? null,
    dias_restantes: num(src.dias_restantes),
    raw: src,
  };
}

// ─── Definições / administração / realtime ─────────────────────────────────

export interface RankingDef {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  escopo: string;
  criterio: string;
  ativo: boolean;
}

export interface RankingMe {
  posicao: number;
  valor: number;
  melhor_posicao: number | null;
  maior_crescimento: number | null;
  maior_queda: number | null;
  ultima_posicao: number | null;
}

interface RankingRpcRow {
  posicao: number | null;
  valor: number | string | null;
  user_id: string;
  nome?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  estado?: string | null;
  cidade?: string | null;
  liga?: string | null;
  nivel?: number | null;
}

interface RankingRpcPayload {
  ranking?: RankingDef | null;
  top?: RankingRpcRow[];
  me?: Partial<RankingMe> | null;
  erro?: string;
}

interface PerfilRanking {
  id: string;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  estado: string | null;
  cidade: string | null;
  liga: string | null;
  nivel: number | null;
  xp: number | null;
  xp_total: number | null;
  liga_pontos: number | null;
  questoes_respondidas_total: number | null;
  questoes_corretas_total: number | null;
  minutos_estudo_total: number | null;
}

export async function fetchRankingDefs(): Promise<RankingDef[]> {
  const { data } = await supabase
    .from("rankings_defs")
    .select("id,slug,nome,descricao,escopo,criterio,ativo")
    .eq("ativo", true)
    .order("nome");
  return (data as RankingDef[]) ?? [];
}

async function fetchRankingDef(slug: string): Promise<RankingDef | null> {
  const { data } = await supabase
    .from("rankings_defs")
    .select("id,slug,nome,descricao,escopo,criterio,ativo")
    .eq("slug", slug)
    .maybeSingle();
  return (data as RankingDef | null) ?? null;
}

function rowFromRpc(r: RankingRpcRow, fallback: number): RankingRowDTO {
  return {
    posicao: num(r.posicao, fallback),
    valor: num(r.valor),
    user_id: r.user_id,
    nome: r.nome ?? null,
    username: r.username ?? null,
    avatar_url: r.avatar_url ?? null,
    estado: r.estado ?? null,
    cidade: r.cidade ?? null,
    liga: r.liga ?? null,
    nivel: r.nivel ?? null,
  };
}

function rowFromPerfil(p: PerfilRanking, valor: number, posicao: number): RankingRowDTO {
  return {
    posicao, valor, user_id: p.id,
    nome: p.nome, username: p.username, avatar_url: p.avatar_url,
    estado: p.estado, cidade: p.cidade, liga: p.liga, nivel: p.nivel,
  };
}

function meFromTop(top: RankingRowDTO[], userId: string | undefined): RankingMe | null {
  const row = userId ? top.find((r) => r.user_id === userId) : null;
  return row
    ? { posicao: row.posicao, valor: row.valor, melhor_posicao: null, maior_crescimento: null, maior_queda: null, ultima_posicao: null }
    : null;
}

export async function loadRankingFull(slug: string, limit: number): Promise<{
  ranking: RankingDef | null;
  top: RankingRowDTO[];
  me: RankingMe | null;
}> {
  const ranking = await fetchRankingDef(slug);
  const user = await getUser();
  const userId = user?.id;
  const criterio = (ranking?.criterio ?? slug).toLowerCase();

  try {
    const { data: rpc, error } = await supabase.rpc("ranking_top", { p_slug: slug, p_limit: 1000, p_offset: 0 });
    if (!error && rpc) {
      const payload = rpc as RankingRpcPayload;
      if (!payload.erro) {
        const full = (payload.top ?? []).map((r, i) => rowFromRpc(r, i + 1));
        const me = payload.me
          ? {
              posicao: num(payload.me.posicao),
              valor: num(payload.me.valor),
              melhor_posicao: payload.me.melhor_posicao ?? null,
              maior_crescimento: payload.me.maior_crescimento ?? null,
              maior_queda: payload.me.maior_queda ?? null,
              ultima_posicao: payload.me.ultima_posicao ?? null,
            }
          : meFromTop(full, userId);
        return { ranking: payload.ranking ?? ranking, top: full.slice(0, limit), me };
      }
    }
  } catch { /* fallback */ }

  const { data: perfis } = await supabase
    .from("profiles")
    .select("id,nome,username,avatar_url,cidade,estado,liga,nivel,xp,xp_total,liga_pontos,questoes_respondidas_total,questoes_corretas_total,minutos_estudo_total")
    .limit(1000);
  const list = (perfis ?? []) as unknown as PerfilRanking[];

  const valorPerfil = (p: PerfilRanking): number => {
    if (["xp", "xp_total"].includes(criterio) || slug.includes("xp")) return num(p.xp_total ?? p.xp);
    if (["lp", "liga_pontos"].includes(criterio) || slug.includes("lp")) return num(p.liga_pontos);
    if (criterio === "nivel" || slug.includes("nivel")) return num(p.nivel, 1);
    if (criterio === "questoes" || slug.includes("questoes")) return num(p.questoes_respondidas_total);
    if (criterio === "tempo" || slug.includes("tempo")) return num(p.minutos_estudo_total);
    if (criterio === "precisao" || slug.includes("precisao")) {
      const r = num(p.questoes_respondidas_total);
      const c = num(p.questoes_corretas_total);
      return r > 0 ? Math.round((c / r) * 1000) / 10 : 0;
    }
    return num(p.xp_total ?? p.xp);
  };
  const full = list
    .map((p) => ({ p, valor: valorPerfil(p) }))
    .sort((a, b) => b.valor - a.valor || (a.p.nome ?? "").localeCompare(b.p.nome ?? ""))
    .map((m, i) => rowFromPerfil(m.p, m.valor, i + 1));

  return { ranking, top: full.slice(0, limit), me: meFromTop(full, userId) };
}

export function subscribeRankingsSnapshots(slug: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`rk-${slug}-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rankings_snapshots" }, () => onChange())
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}

export async function recomputeRanking(id: string) {
  return supabase.rpc("ranking_recompute", { p_ranking: id });
}

export async function recomputeAllRankings() {
  return supabase.rpc("ranking_recompute_all");
}
