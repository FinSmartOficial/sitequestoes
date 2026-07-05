/**
 * Camada de acesso — Arena.
 * Encapsula tudo relacionado à Arena Multiplayer: RPCs, tabelas, chat e Realtime
 * (postgres_changes + presence). Nenhum componente/tela pode consultar essas
 * fontes diretamente — tudo passa por este módulo (ou pelos hooks em ./hooks).
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ============================================================
// Tipos / DTOs
// ============================================================

export type ArenaSalaStatus =
  | "aguardando"
  | "contagem"
  | "em_partida"
  | "finalizando"
  | "resultado";

export interface ArenaSalaDTO {
  id: string;
  nome: string;
  materia: string;
  concurso: string;
  nivel: string;
  dificuldade: string;
  num_questoes: number;
  tempo_questao: number;
  max_jogadores: number;
  status: ArenaSalaStatus;
  status_fase: "lobby" | "respondendo" | "resultado" | null;
  rodada_atual: number | null;
  fase_ends_at: string | null;
  countdown_ends_at: string | null;
  started_at: string | null;
}

export interface ArenaParticipanteDTO {
  sala_id: string;
  user_id: string;
  role: "player" | "spectator";
}

export interface ArenaSalaLite {
  id: string;
  nome: string;
  materia: string;
  status: string;
  created_at: string;
  rodada_atual: number | null;
  fase_ends_at: string | null;
  max_jogadores: number;
}

export interface ArenaMensagemDTO {
  id: string;
  sala_id: string;
  user_id: string;
  texto: string;
  created_at: string;
}

export interface ArenaQuestaoSessaoDTO {
  id: string;
  sala_id: string;
  sessao_started_at: string;
  ordem: number;
  enunciado: string;
  alternativas: string[] | null;
  tipo: "CE" | "MULTIPLA";
  gabarito_idx: number | null;
  gabarito_ce: boolean | null;
  questao_id?: string | null;
  explicacao?: string | null;
}

export interface ArenaRespostaDTO {
  sala_id: string;
  sessao_started_at: string;
  ordem: number;
  user_id: string;
  resposta_idx: number | null;
  resposta_ce: boolean | null;
  acertou: boolean;
}

export interface ArenaRespostaResultadoDTO {
  user_id: string;
  ordem: number;
  acertou: boolean;
  tempo_ms: number | null;
  created_at: string;
}

export interface ArenaTickResult {
  ok: boolean;
  status?: ArenaSalaStatus;
  status_fase?: NonNullable<ArenaSalaDTO["status_fase"]>;
  rodada_atual?: number;
  fase_ends_at?: string | null;
  started_at?: string | null;
  server_now?: string;
  players_count?: number;
  walkover?: boolean;
  vencedor_id?: string;
  error?: string;
}

export interface ArenaEntrarResult {
  ok: boolean;
  error?: string;
  should_start_countdown?: boolean;
}

export interface ArenaQuickMatchResult {
  ok: boolean;
  sala_id?: string;
  reconnected?: boolean;
  created?: boolean;
  error?: string;
}

export interface ProgressoNivelDTO {
  nivel: number;
  xp_total: number;
  xp_nivel: number;
  xp_proximo: number | null;
  xp_no_nivel: number;
  xp_faltando: number;
}

// ============================================================
// Utilitários
// ============================================================

export type ArenaScreen = "lobby" | "match" | "results";

export function salaStatusToScreen(status: ArenaSalaStatus | string | null | undefined): ArenaScreen {
  switch (status) {
    case "em_partida":
      return "match";
    case "resultado":
      return "results";
    default:
      return "lobby";
  }
}

function isRpcSchemaCacheError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache")
  );
}

// ============================================================
// Leituras (queries)
// ============================================================

export async function listSalasEParticipantes(): Promise<{
  salas: ArenaSalaDTO[];
  participantes: ArenaParticipanteDTO[];
}> {
  // Reaper: finaliza salas travadas antes de listar (idempotente, ~1ms).
  try {
    await supabase.rpc("arena_reaper");
  } catch {
    /* ignore */
  }
  const [{ data: s, error: es }, { data: p, error: ep }] = await Promise.all([
    supabase.from("arena_salas").select("*").order("nome"),
    supabase.from("arena_participantes").select("sala_id,user_id,role"),
  ]);
  if (es) throw es;
  if (ep) throw ep;
  return {
    salas: (s ?? []) as ArenaSalaDTO[],
    participantes: (p ?? []) as ArenaParticipanteDTO[],
  };
}

export async function getSala(salaId: string): Promise<ArenaSalaDTO | null> {
  const { data, error } = await supabase
    .from("arena_salas")
    .select("*")
    .eq("id", salaId)
    .maybeSingle();
  if (error) throw error;
  return (data as ArenaSalaDTO | null) ?? null;
}

export async function listSalasAdmin(): Promise<{
  salas: ArenaSalaLite[];
  participantes: Pick<ArenaParticipanteDTO, "sala_id" | "user_id">[];
}> {
  const [{ data: s, error: es }, { data: p, error: ep }] = await Promise.all([
    supabase
      .from("arena_salas")
      .select("id,nome,materia,status,created_at,rodada_atual,fase_ends_at,max_jogadores")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("arena_participantes").select("sala_id,user_id"),
  ]);
  if (es) throw es;
  if (ep) throw ep;
  return {
    salas: (s ?? []) as ArenaSalaLite[],
    participantes: (p ?? []) as Pick<ArenaParticipanteDTO, "sala_id" | "user_id">[],
  };
}

export interface PerfilArenaLite {
  id: string;
  username: string | null;
  nome: string | null;
  avatar_url: string | null;
  liga: string | null;
  nivel?: number | null;
}

/** Fallback público via `profiles_public` (usado quando o server-fn falha). */
export async function fetchArenaPerfisPublic(ids: string[]): Promise<PerfilArenaLite[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles_public")
    .select("id,username,nome,avatar_url,liga,nivel")
    .in("id", unique);
  if (error) throw error;
  return ((data ?? []) as PerfilArenaLite[]).map((p) => ({
    id: p.id,
    username: p.username ?? null,
    nome: p.nome ?? null,
    avatar_url: p.avatar_url ?? null,
    liga: p.liga ?? null,
    nivel: p.nivel ?? null,
  }));
}

export async function listMensagens(salaId: string, limit = 200): Promise<ArenaMensagemDTO[]> {
  const { data, error } = await supabase
    .from("arena_mensagens")
    .select("*")
    .eq("sala_id", salaId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ArenaMensagemDTO[];
}

async function fetchQuestoesExatas(
  salaId: string,
  startedAt: string,
): Promise<ArenaQuestaoSessaoDTO[]> {
  const { data, error } = await supabase
    .from("arena_questoes_sessao")
    .select("*")
    .eq("sala_id", salaId)
    .eq("sessao_started_at", startedAt)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as ArenaQuestaoSessaoDTO[];
}

async function fetchQuestoesJanela(
  salaId: string,
  startedAt: string,
  janelaMs = 2000,
): Promise<ArenaQuestaoSessaoDTO[]> {
  const inicio = new Date(new Date(startedAt).getTime() - janelaMs).toISOString();
  const fim = new Date(new Date(startedAt).getTime() + janelaMs).toISOString();
  const { data, error } = await supabase
    .from("arena_questoes_sessao")
    .select("*")
    .eq("sala_id", salaId)
    .gte("sessao_started_at", inicio)
    .lte("sessao_started_at", fim)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as ArenaQuestaoSessaoDTO[];
}

/**
 * Carrega as questões da sessão atual — tenta match exato, cai para janela
 * de tolerância e, se ainda vazio, dispara `arena_garantir_questoes` no
 * banco e faz polling curto até o snapshot aparecer.
 */
export async function loadQuestoesSessao(
  salaId: string,
  startedAt: string,
): Promise<ArenaQuestaoSessaoDTO[]> {
  let rows = await fetchQuestoesExatas(salaId, startedAt);
  if (rows.length === 0) rows = await fetchQuestoesJanela(salaId, startedAt);
  if (rows.length === 0) {
    const { error } = await supabase.rpc("arena_garantir_questoes", { _sala_id: salaId });
    if (error && !isRpcSchemaCacheError(error)) {
      console.error("[arena] garantir questões", error);
    }
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      rows = await fetchQuestoesExatas(salaId, startedAt);
      if (rows.length === 0) rows = await fetchQuestoesJanela(salaId, startedAt);
      if (rows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return rows.sort((a, b) => a.ordem - b.ordem);
}

export async function listRespostasSessao(
  salaId: string,
  startedAt: string,
): Promise<ArenaRespostaDTO[]> {
  const inicio = new Date(new Date(startedAt).getTime() - 2000).toISOString();
  const fim = new Date(new Date(startedAt).getTime() + 2000).toISOString();
  const { data, error } = await supabase
    .from("arena_respostas")
    .select("sala_id,sessao_started_at,ordem,user_id,resposta_idx,resposta_ce,acertou")
    .eq("sala_id", salaId)
    .gte("sessao_started_at", inicio)
    .lte("sessao_started_at", fim);
  if (error) throw error;
  return ((data ?? []) as ArenaRespostaDTO[]).filter(
    (r) => Math.abs(new Date(r.sessao_started_at).getTime() - new Date(startedAt).getTime()) < 1000,
  );
}

export async function listRespostasResultados(
  salaId: string,
  startedAt: string,
): Promise<ArenaRespostaResultadoDTO[]> {
  const { data, error } = await supabase
    .from("arena_respostas")
    .select("user_id,ordem,acertou,tempo_ms,created_at")
    .eq("sala_id", salaId)
    .eq("sessao_started_at", startedAt)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ArenaRespostaResultadoDTO[];
}

// ============================================================
// Mutations / RPCs
// ============================================================

export async function entrarSala(salaId: string): Promise<ArenaEntrarResult> {
  let { data, error } = await supabase.rpc("arena_entrar", { _sala_id: salaId });
  if (isRpcSchemaCacheError(error)) {
    const fb = await supabase.rpc("arena_entrar", { p_sala_id: salaId });
    data = fb.data;
    error = fb.error;
  }
  if (error) throw error;
  const result = (data ?? { ok: true }) as ArenaEntrarResult;
  if (result.ok && result.should_start_countdown) {
    await tickSala(salaId);
  }
  return result;
}

export async function sairSala(salaId: string): Promise<{ ok: boolean; error?: string; fallback?: string }> {
  let { data, error } = await supabase.rpc("arena_sair", { _sala_id: salaId });
  if (isRpcSchemaCacheError(error)) {
    const fb = await supabase.rpc("arena_sair", { p_sala_id: salaId });
    data = fb.data;
    error = fb.error;
  }
  if (isRpcSchemaCacheError(error)) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("Usuário não autenticado");
    const { error: deleteError } = await supabase
      .from("arena_participantes")
      .delete()
      .eq("sala_id", salaId)
      .eq("user_id", userData.user.id);
    if (deleteError) throw deleteError;
    await garantirWalkover(salaId);
    return { ok: true, fallback: "direct-delete" };
  }
  if (error) throw error;
  return (data ?? { ok: true }) as { ok: boolean; error?: string };
}

export async function tickSala(salaId: string): Promise<ArenaTickResult> {
  const { data, error } = await supabase.rpc("arena_tick", { _sala_id: salaId });
  if (!error) return (data ?? { ok: true }) as ArenaTickResult;

  // Fallback: banco sem `arena_tick` — usa `arena_iniciar`.
  if (isRpcSchemaCacheError(error)) {
    // Segundo alias antes de recorrer ao fallback antigo.
    const alias = await supabase.rpc("arena_tick", { p_sala_id: salaId });
    if (!alias.error) return (alias.data ?? { ok: true }) as ArenaTickResult;
    const { error: iniciarError } = await supabase.rpc("arena_iniciar", { _sala_id: salaId });
    if (iniciarError) console.error("[arena] fallback arena_iniciar", iniciarError);
    return { ok: !iniciarError, error: iniciarError?.message };
  }

  console.error("[arena] tick", error);
  return { ok: false, error: error.message };
}

export async function garantirWalkover(salaId: string): Promise<ArenaTickResult> {
  const { data, error } = await supabase.rpc("arena_garantir_walkover", { _sala_id: salaId });
  if (!error) return (data ?? { ok: true }) as ArenaTickResult;
  if (isRpcSchemaCacheError(error)) return tickSala(salaId);
  console.error("[arena] walkover", error);
  return { ok: false, error: error.message };
}

export async function garantirQuestoes(salaId: string): Promise<void> {
  const { error } = await supabase.rpc("arena_garantir_questoes", { _sala_id: salaId });
  if (error && !isRpcSchemaCacheError(error)) {
    console.error("[arena] garantir questões", error);
    throw error;
  }
}

export async function responder(input: {
  salaId: string;
  ordem: number;
  respostaIdx: number | null;
  respostaCe: boolean | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { salaId, ordem, respostaIdx, respostaCe } = input;
  const first = await supabase.rpc("arena_responder", {
    _sala_id: salaId,
    _ordem: ordem,
    _resposta_idx: respostaIdx,
    _resposta_ce: respostaCe,
  });
  if (!first.error) return { ok: true };
  if (isRpcSchemaCacheError(first.error)) {
    const alias = await supabase.rpc("arena_responder", {
      p_sala_id: salaId,
      p_ordem: ordem,
      p_resposta_idx: respostaIdx,
      p_resposta_ce: respostaCe,
    });
    if (!alias.error) return { ok: true };
    return { ok: false, error: alias.error.message };
  }
  return { ok: false, error: first.error.message };
}

export async function quickMatch(): Promise<ArenaQuickMatchResult> {
  const { data, error } = await supabase.rpc("arena_quick_match");
  if (error) throw error;
  return (data ?? { ok: false }) as ArenaQuickMatchResult;
}

export async function enviarMensagem(input: {
  salaId: string;
  userId: string;
  texto: string;
}): Promise<void> {
  const { salaId, userId, texto } = input;
  const { error } = await supabase.from("arena_mensagens").insert({
    sala_id: salaId,
    user_id: userId,
    texto: texto.slice(0, 500),
  });
  if (error) throw error;
}

export async function fetchProgressoNivel(userId: string): Promise<ProgressoNivelDTO | null> {
  const { data, error } = await supabase.rpc("arena_progresso_nivel", { p_user_id: userId });
  if (error) throw error;
  return (data ?? null) as ProgressoNivelDTO | null;
}

// ============================================================
// Realtime — todas as inscrições vivem AQUI.
// Cada subscribe* retorna a função de cleanup.
// ============================================================

function removeChannel(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel);
}

/** Assina mudanças globais em salas + participantes. */
export function subscribeSalasGlobal(onChange: () => void): () => void {
  const ch = supabase
    .channel(`arena-realtime-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "arena_salas" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "arena_participantes" }, onChange)
    .subscribe();
  return () => removeChannel(ch);
}

/** Assina UPDATEs de uma sala específica. */
export function subscribeSala(
  salaId: string,
  onUpdate: (row: ArenaSalaDTO) => void,
): () => void {
  const ch = supabase
    .channel(`arena-sala-${salaId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "arena_salas", filter: `id=eq.${salaId}` },
      (payload) => onUpdate(payload.new as ArenaSalaDTO),
    )
    .subscribe();
  return () => removeChannel(ch);
}

/** Assina INSERTs no chat da sala. */
export function subscribeChat(
  salaId: string,
  onInsert: (row: ArenaMensagemDTO) => void,
): () => void {
  const ch = supabase
    .channel(`arena-chat-${salaId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arena_mensagens", filter: `sala_id=eq.${salaId}` },
      (payload) => onInsert(payload.new as ArenaMensagemDTO),
    )
    .subscribe();
  return () => removeChannel(ch);
}

/** Assina INSERTs no snapshot de questões da sessão. */
export function subscribeQuestoesSessao(
  salaId: string,
  onInsert: (row: ArenaQuestaoSessaoDTO) => void,
): () => void {
  const ch = supabase
    .channel(`arena-questoes-${salaId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arena_questoes_sessao", filter: `sala_id=eq.${salaId}` },
      (payload) => onInsert(payload.new as ArenaQuestaoSessaoDTO),
    )
    .subscribe();
  return () => removeChannel(ch);
}

/** Assina INSERTs de respostas da sessão. */
export function subscribeRespostasSessao(
  salaId: string,
  onInsert: (row: ArenaRespostaDTO) => void,
): () => void {
  const ch = supabase
    .channel(`arena-resp-${salaId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arena_respostas", filter: `sala_id=eq.${salaId}` },
      (payload) => onInsert(payload.new as ArenaRespostaDTO),
    )
    .subscribe();
  return () => removeChannel(ch);
}

/** Assina INSERTs em arena_xp_historico do usuário. */
export function subscribeArenaXp(userId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`arena-xp-${userId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arena_xp_historico", filter: `user_id=eq.${userId}` },
      onChange,
    )
    .subscribe();
  return () => removeChannel(ch);
}

// ============================================================
// Realtime — Presence do lobby (canal com estado por usuário).
// ============================================================

export interface LobbyPresenceMeta {
  user_id: string;
  ready: boolean;
  online_at: string;
}

export interface LobbyPresenceHandle {
  track: (meta: LobbyPresenceMeta) => Promise<void>;
  unsubscribe: () => void;
}

/**
 * Assina o canal de presença do lobby. `onSync` recebe a última meta de cada
 * usuário presente. `join` = envia `track` inicial após conectar (se true).
 */
export function subscribeLobbyPresence(input: {
  salaId: string;
  userId: string;
  join: boolean;
  onSync: (presence: Record<string, LobbyPresenceMeta>) => void;
}): LobbyPresenceHandle {
  const { salaId, userId, join, onSync } = input;
  const channel = supabase.channel(`arena-lobby-${salaId}`, {
    config: { presence: { key: userId } },
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<LobbyPresenceMeta>();
    const next: Record<string, LobbyPresenceMeta> = {};
    for (const key of Object.keys(state)) {
      const metas = state[key];
      if (metas && metas[0]) next[key] = metas[0];
    }
    onSync(next);
  });

  void channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED" && join) {
      await channel.track({
        user_id: userId,
        ready: false,
        online_at: new Date().toISOString(),
      } satisfies LobbyPresenceMeta);
    }
  });

  return {
    track: async (meta) => {
      await channel.track(meta);
    },
    unsubscribe: () => removeChannel(channel),
  };
}
