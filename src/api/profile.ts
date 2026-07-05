/**
 * Camada de perfil — Fase 13.
 * Fonte única de dados de perfil, estatísticas, histórico, amigos e busca.
 * Componentes NUNCA devem falar diretamente com o supabase — só através
 * desta camada (via hooks em `src/api/hooks.ts`).
 */
import { supabase } from "@/lib/supabase";

export interface ProfileDTO {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  cargo_desejado: string | null;
  concurso_sonho: string | null;
  cidade: string | null;
  estado: string | null;
  xp_total: number;
  xp_atual: number;
  nivel: number;
  liga: string;
  visibilidade: "publico" | "privado" | "amigos";
  meta_diaria_questoes: number | null;
  meta_diaria_minutos: number | null;
  created_at: string;
}

export interface ProfileStatsDTO {
  respondidas: number;
  corretas: number;
  erradas: number;
  minutos: number;
  horas: number;
  simulados: number;
  tempo_medio_seg: number;
  streak_atual: number;
  melhor_streak: number;
}

export interface ProfileHistoryItem {
  id: string;
  titulo: string;
  subtitulo: string;
  data: string;
}

export interface ProfileHistoryDTO {
  simulados: ProfileHistoryItem[];
  questoes: ProfileHistoryItem[];
  estudos: ProfileHistoryItem[];
}

export interface FriendMini {
  id: string;
  username: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  liga: string;
  nivel: number;
}

type UpdatableProfileFields =
  | "nome"
  | "sobrenome"
  | "username"
  | "bio"
  | "avatar_url"
  | "banner_url"
  | "cargo_desejado"
  | "concurso_sonho"
  | "cidade"
  | "estado"
  | "visibilidade"
  | "meta_diaria_questoes"
  | "meta_diaria_minutos";

export type ProfilePatch = Partial<Pick<ProfileDTO, UpdatableProfileFields>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeLiga(v: unknown): string {
  const s = String(v ?? "Bronze").toLowerCase();
  const map: Record<string, string> = {
    bronze: "Bronze", prata: "Prata", ouro: "Ouro", platina: "Platina",
    diamante: "Diamante", mestre: "Mestre", lenda: "Lenda",
  };
  return map[s] ?? "Bronze";
}

function normalizeVisibilidade(v: unknown): ProfileDTO["visibilidade"] {
  return v === "privado" || v === "amigos" ? v : "publico";
}

function normalize(row: Record<string, unknown> | null): ProfileDTO | null {
  if (!row) return null;
  const xpTotal = Math.max(0, Number(row.xp_total ?? row.xp ?? 0) || 0);
  const xpAtual = Math.max(0, Number(row.xp_atual ?? xpTotal % 1000) || 0);
  return {
    id: String(row.id),
    nome: (row.nome as string) ?? null,
    sobrenome: (row.sobrenome as string) ?? null,
    username: (row.username as string) ?? null,
    bio: (row.bio as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    banner_url: (row.banner_url as string) ?? null,
    cargo_desejado: (row.cargo_desejado as string) ?? null,
    concurso_sonho: (row.concurso_sonho as string) ?? null,
    cidade: (row.cidade as string) ?? null,
    estado: (row.estado as string) ?? null,
    xp_total: xpTotal,
    xp_atual: xpAtual,
    nivel: Number(row.nivel ?? 1) || 1,
    liga: normalizeLiga(row.liga),
    visibilidade: normalizeVisibilidade(row.visibilidade),
    meta_diaria_questoes: (row.meta_diaria_questoes as number) ?? null,
    meta_diaria_minutos: (row.meta_diaria_minutos as number) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function getMyProfile(userId: string): Promise<ProfileDTO | null> {
  const rpc = await supabase.rpc("profile_get_or_create");
  if (!rpc.error && rpc.data) return normalize(rpc.data as Record<string, unknown>);
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return normalize(data as Record<string, unknown> | null);
}

export async function getProfileByUsername(usernameOrId: string): Promise<ProfileDTO | null> {
  const key = (usernameOrId ?? "").trim().replace(/^@/, "");
  if (!key) return null;
  const query = supabase.from("profiles").select("*");
  const res = UUID_RE.test(key)
    ? await query.eq("id", key).maybeSingle()
    : await query.ilike("username", key).maybeSingle();
  if (res.error) throw res.error;
  return normalize(res.data as Record<string, unknown> | null);
}

export async function updateMyProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const u = (username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return false;
  const { data, error } = await supabase.from("profiles").select("id").ilike("username", u).maybeSingle();
  if (error) return false;
  return !data;
}

export async function getProfileStats(userId: string): Promise<ProfileStatsDTO> {
  const { data } = await supabase
    .from("profiles")
    .select("questoes_respondidas_total,questoes_corretas_total,questoes_erradas_total,minutos_estudo_total,simulados_total,tempo_medio_seg,streak_atual,melhor_streak")
    .eq("id", userId)
    .maybeSingle();
  const p = (data ?? {}) as Record<string, number | null>;
  const respondidas = Number(p.questoes_respondidas_total ?? 0);
  const corretas = Math.min(respondidas, Number(p.questoes_corretas_total ?? 0));
  const erradas = Math.max(0, Number(p.questoes_erradas_total ?? respondidas - corretas));
  const minutos = Number(p.minutos_estudo_total ?? 0);
  return {
    respondidas,
    corretas,
    erradas,
    minutos,
    horas: Math.round((minutos / 60) * 10) / 10,
    simulados: Number(p.simulados_total ?? 0),
    tempo_medio_seg: Number(p.tempo_medio_seg ?? 0),
    streak_atual: Number(p.streak_atual ?? 0),
    melhor_streak: Number(p.melhor_streak ?? 0),
  };
}

export async function getProfileHistory(userId: string): Promise<ProfileHistoryDTO> {
  const [{ data: s }, { data: q }, { data: e }] = await Promise.all([
    supabase.from("simulado_resultados").select("id,simulado_nome,acertos,total,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("respostas_banco").select("id,resposta,correta,disciplina,assunto,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("sessoes_estudo").select("id,materia,minutos,data").eq("user_id", userId).order("data", { ascending: false }).limit(10),
  ]);
  type SRow = { id: string; simulado_nome: string; acertos: number; total: number; created_at: string };
  type QRow = { id: string; resposta: string | null; correta: boolean; disciplina: string | null; assunto: string | null; created_at: string };
  type ERow = { id: string; materia: string; minutos: number; data: string };
  return {
    simulados: ((s ?? []) as SRow[]).map((r) => ({ id: r.id, titulo: r.simulado_nome, subtitulo: `${r.acertos}/${r.total} acertos`, data: r.created_at })),
    questoes: ((q ?? []) as QRow[]).map((r) => ({
      id: r.id,
      titulo: r.correta ? "Questão correta" : "Questão incorreta",
      subtitulo: [r.disciplina, r.assunto, r.resposta].filter(Boolean).join(" · ") || "Resposta registrada",
      data: r.created_at,
    })),
    estudos: ((e ?? []) as ERow[]).map((r) => ({ id: r.id, titulo: r.materia, subtitulo: `${r.minutos} min`, data: r.data })),
  };
}

export async function getFriends(userId: string): Promise<FriendMini[]> {
  const { data } = await supabase
    .from("amizades")
    .select("requester_id,addressee_id,status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  type R = { requester_id: string; addressee_id: string };
  const ids = ((data ?? []) as R[]).map((a) => (a.requester_id === userId ? a.addressee_id : a.requester_id));
  if (!ids.length) return [];
  const { data: ps } = await supabase
    .from("profiles_public")
    .select("id,username,nome,sobrenome,avatar_url,liga,nivel")
    .in("id", ids);
  return (ps ?? []) as FriendMini[];
}
