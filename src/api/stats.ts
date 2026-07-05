/**
 * Stats — camada oficial (Fase 14E).
 * Centraliza consumo das RPCs `stats_*` e fornece fallback quando indisponíveis.
 * Nenhum consumidor fora de `src/api/*` deve acessar `supabase.rpc`/`supabase.from`
 * para dados de estatísticas.
 */
import { supabase } from "@/lib/supabase";

export type StatsDashboard = {
  tempo: { hoje_min: number; semana_min: number; mes_min: number; total_min: number };
  questoes: { total: number; acertos: number; erros: number; precisao: number; tempo_medio_seg: number; maior_sequencia: number };
  sequencia: { atual_dias: number; maior_dias: number };
  arena: { partidas: number; vitorias: number; podios: number };
  perfil: { xp: number; nivel: number; liga: string; liga_pontos: number; username: string | null; nome: string | null; avatar_url: string | null };
};

export type EvolucaoRow = { dia: string; minutos: number; questoes: number; acertos: number; precisao: number };
export type DisciplinaRow = { materia: string; questoes: number; acertos: number; precisao: number; minutos: number; tempo_medio_seg: number; sessoes: number };
export type HeatmapRow = { dia: string; minutos: number; questoes: number; intensidade: number };

export type StatsRecomendacoes = {
  mensagens: { tipo: "positivo" | "atencao"; texto: string }[];
  pontos_fortes: { materia: string; precisao: number; questoes: number }[];
  pontos_melhoria: { materia: string; precisao: number; questoes: number }[];
  precisao_geral: number;
  precisao_30d: number;
  precisao_anterior: number;
  frequencia_7d: number;
};

type SessaoStats = { data: string; minutos: number | null; materia: string | null; questoes_total: number | null; questoes_acertos: number | null };
type RespostaStats = { created_at: string; disciplina: string | null; correta: boolean | null };
type PerfilStats = {
  xp_total?: number | null; xp?: number | null; nivel?: number | null; liga?: string | null; liga_pontos?: number | null;
  username?: string | null; nome?: string | null; avatar_url?: string | null; streak_atual?: number | null;
  questoes_respondidas_total?: number | null; questoes_corretas_total?: number | null; questoes_erradas_total?: number | null;
  minutos_estudo_total?: number | null; tempo_medio_seg?: number | null;
};

async function loadFallbackRows() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const [{ data: perfil }, { data: sessoes }, { data: respostas }] = await Promise.all([
    supabase.from("profiles")
      .select("xp_total,xp,nivel,liga,liga_pontos,username,nome,avatar_url,streak_atual,questoes_respondidas_total,questoes_corretas_total,questoes_erradas_total,minutos_estudo_total,tempo_medio_seg")
      .eq("id", userId).maybeSingle(),
    supabase.from("sessoes_estudo").select("data,minutos,materia,questoes_total,questoes_acertos").eq("user_id", userId),
    supabase.from("respostas_banco").select("created_at,disciplina,correta").eq("user_id", userId),
  ]);
  return {
    perfil: (perfil ?? {}) as PerfilStats,
    sessoes: (sessoes ?? []) as SessaoStats[],
    respostas: (respostas ?? []) as RespostaStats[],
  };
}

function sumQuestoes(perfil: PerfilStats, respostas: RespostaStats[]) {
  const totalPerfil = Math.max(0, perfil.questoes_respondidas_total ?? 0);
  const acertosPerfil = Math.max(0, perfil.questoes_corretas_total ?? 0);
  const total = totalPerfil || respostas.length;
  const acertos = Math.min(total, totalPerfil ? acertosPerfil : respostas.filter((r) => r.correta === true).length);
  const minutos = Math.max(0, perfil.minutos_estudo_total ?? 0);
  return { total, acertos, erros: Math.max(0, total - acertos), minutos };
}

function respostaDia(row: RespostaStats) {
  return new Date(row.created_at).toISOString().slice(0, 10);
}

function currentStreak(rows: SessaoStats[], fallback = 0) {
  const dias = new Set(rows.map((r) => r.data).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  while (dias.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return Math.max(streak, fallback);
}

export async function fetchDashboard(): Promise<StatsDashboard | null> {
  const { data, error } = await supabase.rpc("stats_dashboard");
  if (!error) return data as StatsDashboard;
  console.warn("[stats] stats_dashboard falhou", error);
  const fallback = await loadFallbackRows();
  if (!fallback) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const semanaInicio = new Date(); semanaInicio.setDate(semanaInicio.getDate() - 6);
  const mesInicio = new Date(); mesInicio.setDate(mesInicio.getDate() - 29);
  const semanaDia = semanaInicio.toISOString().slice(0, 10);
  const mesDia = mesInicio.toISOString().slice(0, 10);
  const totals = sumQuestoes(fallback.perfil, fallback.respostas);
  const sequencia = currentStreak(fallback.sessoes, fallback.perfil.streak_atual ?? 0);
  return {
    tempo: {
      hoje_min: fallback.sessoes.filter((r) => r.data === hoje).reduce((s, r) => s + (r.minutos ?? 0), 0),
      semana_min: fallback.sessoes.filter((r) => r.data >= semanaDia).reduce((s, r) => s + (r.minutos ?? 0), 0),
      mes_min: fallback.sessoes.filter((r) => r.data >= mesDia).reduce((s, r) => s + (r.minutos ?? 0), 0),
      total_min: totals.minutos,
    },
    questoes: {
      total: totals.total, acertos: totals.acertos, erros: totals.erros,
      precisao: totals.total > 0 ? Math.round((totals.acertos / totals.total) * 100) : 0,
      tempo_medio_seg: fallback.perfil.tempo_medio_seg ?? (totals.total > 0 ? Math.round((totals.minutos * 60) / totals.total) : 0),
      maior_sequencia: sequencia,
    },
    sequencia: { atual_dias: sequencia, maior_dias: sequencia },
    arena: { partidas: 0, vitorias: 0, podios: 0 },
    perfil: {
      xp: fallback.perfil.xp_total ?? fallback.perfil.xp ?? 0,
      nivel: fallback.perfil.nivel ?? 1,
      liga: fallback.perfil.liga ?? "Bronze",
      liga_pontos: fallback.perfil.liga_pontos ?? 0,
      username: fallback.perfil.username ?? null,
      nome: fallback.perfil.nome ?? null,
      avatar_url: fallback.perfil.avatar_url ?? null,
    },
  };
}

export async function fetchEvolucao(dias: number): Promise<EvolucaoRow[]> {
  const { data, error } = await supabase.rpc("stats_evolucao", { p_dias: dias });
  if (!error) return (data ?? []) as EvolucaoRow[];
  console.warn("[stats] stats_evolucao falhou", error);
  const fallback = await loadFallbackRows();
  if (!fallback) return [];
  const inicio = new Date(); inicio.setDate(inicio.getDate() - Math.max(0, dias - 1));
  const map = new Map<string, EvolucaoRow>();
  for (let i = 0; i < dias; i += 1) {
    const d0 = new Date(inicio); d0.setDate(inicio.getDate() + i);
    const dia = d0.toISOString().slice(0, 10);
    map.set(dia, { dia, minutos: 0, questoes: 0, acertos: 0, precisao: 0 });
  }
  fallback.respostas.forEach((r) => {
    const row = map.get(respostaDia(r));
    if (!row) return;
    row.questoes += 1;
    row.acertos += r.correta ? 1 : 0;
  });
  fallback.sessoes.forEach((s) => {
    const row = map.get(s.data);
    if (!row) return;
    row.minutos += s.minutos ?? 0;
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    acertos: Math.min(r.questoes, r.acertos),
    precisao: r.questoes > 0 ? Math.round((Math.min(r.questoes, r.acertos) / r.questoes) * 100) : 0,
  }));
}

export async function fetchDisciplinas(): Promise<DisciplinaRow[]> {
  const { data, error } = await supabase.rpc("stats_disciplinas");
  if (!error) return (data ?? []) as DisciplinaRow[];
  console.warn("[stats] stats_disciplinas falhou", error);
  const fallback = await loadFallbackRows();
  if (!fallback) return [];
  const map = new Map<string, DisciplinaRow>();
  fallback.respostas.forEach((r) => {
    const materia = r.disciplina || "Questões";
    const row = map.get(materia) ?? { materia, questoes: 0, acertos: 0, precisao: 0, minutos: 0, tempo_medio_seg: 0, sessoes: 0 };
    row.questoes += 1; row.acertos += r.correta ? 1 : 0;
    map.set(materia, row);
  });
  fallback.sessoes.forEach((s) => {
    const materia = s.materia || "Questões";
    const row = map.get(materia) ?? { materia, questoes: 0, acertos: 0, precisao: 0, minutos: 0, tempo_medio_seg: 0, sessoes: 0 };
    row.minutos += s.minutos ?? 0; row.sessoes += 1;
    map.set(materia, row);
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    acertos: Math.min(r.questoes, r.acertos),
    precisao: r.questoes > 0 ? Math.round((Math.min(r.questoes, r.acertos) / r.questoes) * 100) : 0,
    tempo_medio_seg: r.questoes > 0 ? Math.round((r.minutos * 60) / r.questoes) : 0,
  })).sort((a, b) => b.questoes - a.questoes);
}

export async function fetchHeatmap(): Promise<HeatmapRow[]> {
  const { data, error } = await supabase.rpc("stats_heatmap");
  if (!error) return (data ?? []) as HeatmapRow[];
  console.warn("[stats] stats_heatmap falhou", error);
  const fallback = await loadFallbackRows();
  if (!fallback) return [];
  const inicio = new Date(); inicio.setDate(inicio.getDate() - 370);
  const inicioDia = inicio.toISOString().slice(0, 10);
  const map = new Map<string, HeatmapRow>();
  fallback.respostas.filter((r) => respostaDia(r) >= inicioDia).forEach((r) => {
    const dia = respostaDia(r);
    const row = map.get(dia) ?? { dia, minutos: 0, questoes: 0, intensidade: 0 };
    row.questoes += 1;
    map.set(dia, row);
  });
  fallback.sessoes.filter((s) => s.data >= inicioDia).forEach((s) => {
    const row = map.get(s.data) ?? { dia: s.data, minutos: 0, questoes: 0, intensidade: 0 };
    row.minutos += s.minutos ?? 0;
    map.set(s.data, row);
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    intensidade: Math.min(4, Math.max(1, Math.ceil((r.minutos + r.questoes * 2) / 20))),
  })).sort((a, b) => a.dia.localeCompare(b.dia));
}

export async function fetchRecomendacoes(): Promise<StatsRecomendacoes | null> {
  const { data, error } = await supabase.rpc("stats_recomendacoes");
  if (!error) return data as StatsRecomendacoes;
  console.warn("[stats] stats_recomendacoes falhou", error);
  const fallback = await loadFallbackRows();
  if (!fallback) return null;
  const totals = sumQuestoes(fallback.perfil, fallback.respostas);
  const porMateria = new Map<string, { materia: string; questoes: number; acertos: number; precisao: number }>();
  fallback.respostas.forEach((r) => {
    const materia = r.disciplina || "Questões";
    const row = porMateria.get(materia) ?? { materia, questoes: 0, acertos: 0, precisao: 0 };
    row.questoes += 1; row.acertos += r.correta ? 1 : 0;
    porMateria.set(materia, row);
  });
  const materias = Array.from(porMateria.values()).map((r) => ({
    ...r,
    acertos: Math.min(r.questoes, r.acertos),
    precisao: r.questoes > 0 ? Math.round((Math.min(r.questoes, r.acertos) / r.questoes) * 100) : 0,
  }));
  const precisao = totals.total > 0 ? Math.round((totals.acertos / totals.total) * 100) : 0;
  const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 6);
  return {
    mensagens: totals.total === 0
      ? [{ tipo: "atencao", texto: "Responda algumas questões para receber recomendações inteligentes." }]
      : [{ tipo: "positivo", texto: "Seu plano foi atualizado com base no histórico salvo no banco." }],
    pontos_fortes: materias.filter((m) => m.questoes >= 1).sort((a, b) => b.precisao - a.precisao).slice(0, 3),
    pontos_melhoria: materias.filter((m) => m.questoes >= 1).sort((a, b) => a.precisao - b.precisao).slice(0, 3),
    precisao_geral: precisao,
    precisao_30d: precisao,
    precisao_anterior: 0,
    frequencia_7d: new Set(fallback.respostas.filter((r) => respostaDia(r) >= seteDias.toISOString().slice(0, 10)).map(respostaDia)).size,
  };
}
