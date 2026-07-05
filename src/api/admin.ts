/**
 * Admin — camada oficial (Fase 14G).
 * Centraliza todos os acessos ao Supabase originados no painel administrativo.
 * Nenhuma rota `_app.admin.*` deve chamar `supabase.*` diretamente.
 */
import { supabase } from "@/lib/supabase";

// ---------- Dashboard ----------
export interface AdminDashboardMetrics {
  usuarios: number;
  novos_hoje: number;
  questoes: number;
  missoes_ativas: number;
  insignias: number;
  arenas_ativas: number;
}
export interface AdminQualityStats {
  denuncias_total: number;
  denuncias_abertas: number;
  denuncias_corrigidas: number;
  tempo_medio_h: number;
  baixa_qualidade: number;
  tipos_top: Record<string, number>;
}

export async function fetchDashboardMetrics(): Promise<AdminDashboardMetrics | null> {
  const { data } = await supabase.rpc("admin_dashboard_metrics");
  return (data ?? null) as AdminDashboardMetrics | null;
}

export async function fetchQualityStats(): Promise<AdminQualityStats | null> {
  const { data } = await supabase.rpc("qq_estatisticas");
  return (data ?? null) as AdminQualityStats | null;
}

// ---------- Disciplinas ----------
export async function fetchDisciplinasSample(limit = 10000): Promise<{ materia: string | null }[]> {
  const { data } = await supabase.from("questoes_banco").select("materia").limit(limit);
  return (data ?? []) as { materia: string | null }[];
}

// ---------- Conquistas ----------
export interface AdminConquista {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  categoria: string;
  raridade: string;
  xp_recompensa: number;
  ativa: boolean;
  oculta: boolean;
  criterio: { tipo?: string; valor?: number };
}
export async function listConquistas(): Promise<AdminConquista[]> {
  const { data } = await supabase
    .from("prog_conquistas")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminConquista[];
}
export async function upsertConquista(payload: AdminConquista): Promise<void> {
  const { error } = await supabase.rpc("prog_admin_upsert_conquista", {
    payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw error;
}
export async function deleteConquista(id: string): Promise<void> {
  const { error } = await supabase.rpc("prog_admin_delete_conquista", { _id: id });
  if (error) throw error;
}

// ---------- Configurações ----------
export interface AdminConfigRow {
  chave: string;
  valor: unknown;
  descricao: string | null;
  categoria: string;
}
export async function listAdminConfigs(): Promise<AdminConfigRow[]> {
  const { data } = await supabase
    .from("admin_config")
    .select("chave,valor,descricao,categoria")
    .order("categoria")
    .order("chave");
  return (data ?? []) as AdminConfigRow[];
}
export async function setAdminConfig(chave: string, valor: unknown): Promise<void> {
  const { error } = await supabase.rpc("admin_set_config", { p_chave: chave, p_valor: valor });
  if (error) throw error;
}

// ---------- Rankings ----------
export interface AdminRankingDef {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  escopo: string;
  criterio: string;
  ativo: boolean;
}
export async function listRankingDefs(): Promise<AdminRankingDef[]> {
  const { data } = await supabase
    .from("rankings_defs")
    .select("id,slug,nome,descricao,escopo,criterio,ativo")
    .order("nome");
  return (data ?? []) as AdminRankingDef[];
}
export async function createRankingDef(form: {
  slug: string;
  nome: string;
  criterio: string;
  escopo: string;
}): Promise<void> {
  const { error } = await supabase.from("rankings_defs").insert(form);
  if (error) throw error;
}
export async function toggleRankingDef(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("rankings_defs").update({ ativo }).eq("id", id);
  if (error) throw error;
}
export async function deleteRankingDef(id: string): Promise<void> {
  const { error } = await supabase.from("rankings_defs").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Questões (admin) ----------
export interface AdminProfileRow {
  id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
}
export async function listProfilesForAdmin(): Promise<AdminProfileRow[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id,nome,email,created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminProfileRow[];
}
export async function countQuestoes(): Promise<number> {
  const { count } = await supabase.from("questoes_banco").select("*", { count: "exact", head: true });
  return count ?? 0;
}
export async function insertQuestaoBanco(payload: {
  materia: string;
  topico: string | null;
  banca: string;
  tipo: string;
  enunciado: string;
  gabarito_ce: boolean;
  comentario: string | null;
}): Promise<void> {
  const { error } = await supabase.from("questoes_banco").insert(payload);
  if (error) throw error;
}

// ---------- QRE (Motor de Recomendação) ----------
export interface QreConfigRow {
  versao: string;
  pesos: Record<string, number>;
  distribuicao: Record<string, number>;
  janela_repeticao_dias: number;
  max_por_disciplina: number;
  max_por_assunto: number;
}
export async function fetchQreConfig(): Promise<QreConfigRow | null> {
  const { data } = await supabase.from("qre_config").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  return {
    versao: data.versao,
    pesos: data.pesos,
    distribuicao: data.distribuicao,
    janela_repeticao_dias: data.janela_repeticao_dias,
    max_por_disciplina: data.max_por_disciplina,
    max_por_assunto: data.max_por_assunto,
  };
}
export async function setQreConfig(payload: QreConfigRow): Promise<void> {
  const { error } = await supabase.rpc("qre_admin_set_config", {
    _payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw error;
}

// ---------- Missões ----------
export interface AdminMissao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  meta: number;
  xp_recompensa: number;
  ativa: boolean;
}
export async function listMissoes(): Promise<AdminMissao[]> {
  const { data } = await supabase
    .from("missoes")
    .select("id,tipo,titulo,descricao,meta,xp_recompensa,ativa")
    .order("tipo")
    .order("titulo");
  return (data ?? []) as AdminMissao[];
}
export async function toggleMissaoAtiva(id: string, ativa: boolean): Promise<void> {
  const { error } = await supabase.from("missoes").update({ ativa }).eq("id", id);
  if (error) throw error;
}
export async function logAdminAction(
  acao: string,
  entidade: string,
  entidadeId: string,
  detalhes: Record<string, unknown>,
): Promise<void> {
  await supabase.rpc("admin_log", {
    p_acao: acao,
    p_entidade: entidade,
    p_entidade_id: entidadeId,
    p_detalhes: detalhes,
  });
}

// ---------- Qualidade / Denúncias ----------
export interface AdminDenuncia {
  id: string;
  questao_id: string;
  tipo: string;
  descricao: string | null;
  prioridade: "alta" | "media" | "baixa";
  status: string;
  created_at: string;
  user_id: string | null;
  enunciado: string;
  materia: string;
  banca: string | null;
  score: number;
}
export async function listDenuncias(params: {
  status: string | null;
  prio: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminDenuncia[]> {
  const { data } = await supabase.rpc("qq_listar_denuncias", {
    _status: params.status,
    _prio: params.prio,
    _limit: params.limit ?? 100,
    _offset: params.offset ?? 0,
  });
  return (data ?? []) as AdminDenuncia[];
}
export async function scanQualidade(): Promise<number> {
  const { data, error } = await supabase.rpc("qq_scan_automatico");
  if (error) throw error;
  return (data as number) ?? 0;
}
export async function atualizarStatusDenuncia(params: {
  denunciaId: string;
  novoStatus: string;
  resolucao: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("qq_atualizar_status", {
    _denuncia_id: params.denunciaId,
    _novo_status: params.novoStatus,
    _resolucao: params.resolucao,
  });
  if (error) throw error;
}
export async function reportarProblemaQuestao(params: {
  questaoId: string;
  tipo: string;
  descricao: string | null;
  anexoUrl: string | null;
  link: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("qq_reportar", {
    _questao_id: params.questaoId,
    _tipo: params.tipo,
    _descricao: params.descricao,
    _anexo_url: params.anexoUrl,
    _link: params.link,
  });
  if (error) throw error;
}

// ---------- Explicações (admin) ----------
export interface ExplBuscaRow {
  id: string;
  questao_id: string;
  versao: number;
  status: string;
  hash: string;
  idioma: string;
  autor_tipo: string;
  modelo_ia: string | null;
  conteudo: unknown;
  curtidas: number;
  descurtidas: number;
  visualizacoes: number;
  created_at: string;
  updated_at: string;
  materia?: string;
  topico?: string | null;
  enunciado?: string;
}
export interface ExplStats {
  total: number;
  ativas: number;
  em_revisao: number;
  rascunhos: number;
  cobertura: number;
}
export async function buscarExplicacoes(params: {
  termo: string | null;
  status: string | null;
  limit?: number;
  offset?: number;
}): Promise<ExplBuscaRow[]> {
  const { data } = await supabase.rpc("expl_buscar", {
    _termo: params.termo,
    _status: params.status,
    _limit: params.limit ?? 100,
    _offset: params.offset ?? 0,
  });
  return (data ?? []) as ExplBuscaRow[];
}
export async function estatisticasExplicacoes(): Promise<ExplStats | null> {
  const { data } = await supabase.rpc("expl_estatisticas");
  return (data ?? null) as ExplStats | null;
}
export async function ativarVersaoExplicacao(versaoId: string): Promise<void> {
  const { error } = await supabase.rpc("expl_ativar_versao", { _versao_id: versaoId });
  if (error) throw error;
}
export async function marcarRevisaoExplicacao(versaoId: string, motivo = "Manual"): Promise<void> {
  const { error } = await supabase.rpc("expl_marcar_revisao", {
    _versao_id: versaoId,
    _motivo: motivo,
  });
  if (error) throw error;
}

// Versionamento manual de explicações
export async function proximaVersaoExplicacao(questaoId: string): Promise<number> {
  const { data, error } = await supabase
    .from("explicacoes_versoes")
    .select("versao")
    .eq("questao_id", questaoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (((data as { versao?: number } | null)?.versao) ?? 0) + 1;
}
export async function arquivarVersoesAtivas(questaoId: string): Promise<void> {
  const { error } = await supabase
    .from("explicacoes_versoes")
    .update({ status: "arquivada" })
    .eq("questao_id", questaoId)
    .eq("status", "ativa");
  if (error) throw new Error(error.message);
}
export interface InsertExplicacaoVersaoInput {
  questao_id: string;
  versao: number;
  status: string;
  conteudo: unknown;
  hash: string;
  idioma: string;
  autor_tipo: string;
  modelo_ia: string | null;
  observacoes: string;
}
export async function inserirExplicacaoVersao(payload: InsertExplicacaoVersaoInput): Promise<void> {
  const { error } = await supabase.from("explicacoes_versoes").insert(payload);
  if (error) throw new Error(error.message);
}

// Busca de questões para gestão de explicações
export const QUESTAO_EXPL_COLS =
  "id,materia,topico,banca,tipo,enunciado,alternativas,gabarito_ce,gabarito_idx,comentario,explicacoes_versoes!left(id,status)";

export async function buscarQuestoesPorTermo<T>(termo: string, limit = 12): Promise<T[]> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select(QUESTAO_EXPL_COLS)
    .or(`enunciado.ilike.%${termo}%,materia.ilike.%${termo}%,topico.ilike.%${termo}%`)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T[];
}
export async function listarQuestoesComExplicacoes<T>(limit = 5000): Promise<T[]> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select(QUESTAO_EXPL_COLS)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T[];
}
export async function listarQuestoesIdsComExplicacoes<T>(limit = 5000): Promise<T[]> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select("id, explicacoes_versoes!left(id, status)")
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T[];
}
export async function obterQuestaoPorId<T>(id: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("questoes_banco")
    .select("id,materia,topico,banca,tipo,enunciado,alternativas,gabarito_ce,gabarito_idx,comentario")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as T) ?? null;
}
