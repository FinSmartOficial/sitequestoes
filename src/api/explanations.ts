/**
 * Explanations — camada oficial (Fase 14E).
 * Centraliza RPCs `expl_*` e a server-fn `gerarExplicacao`.
 */
import { supabase } from "@/lib/supabase";
import { gerarExplicacao as gerarExplicacaoFn } from "@/lib/gerar-explicacao.functions";

export interface ExplicacaoAlternativa {
  letra: string;
  correta: boolean;
  analise: string;
}

export interface ExplicacaoConteudo {
  resposta_correta: string;
  resumo: string;
  explicacao_completa: string;
  alternativas: ExplicacaoAlternativa[];
  pegadinha?: string;
  fundamentacao?: string;
  resumo_memorizar?: string;
  macete?: string;
  assuntos_relacionados?: string[];
  dificuldade?: "facil" | "medio" | "dificil";
  dificuldade_justificativa?: string;
  competencias?: string[];
  erros_comuns?: string;
  tempo_medio_segundos?: number;
  comentario_professor?: string;
}

export interface ExplicacaoAtiva {
  id: string;
  questao_id: string;
  versao: number;
  hash: string;
  idioma: string;
  autor_tipo: string;
  modelo_ia?: string | null;
  created_at: string;
  updated_at: string;
  curtidas: number;
  descurtidas: number;
  visualizacoes: number;
  conteudo: ExplicacaoConteudo;
  meu_feedback?: { util: boolean; denuncia: boolean } | null;
}

export async function fetchExplicacaoAtiva(questaoId: string): Promise<ExplicacaoAtiva | null> {
  const { data, error } = await supabase.rpc("expl_obter_ativa", { _questao_id: questaoId });
  if (error) throw error;
  return (data as ExplicacaoAtiva) ?? null;
}

export function registrarVisualizacao(versaoId: string): void {
  // fire-and-forget
  void supabase.rpc("expl_registrar_visualizacao", { _versao_id: versaoId });
}

export async function gerarNovaExplicacao(questaoId: string, forcar = false): Promise<void> {
  await gerarExplicacaoFn({ data: { questao_id: questaoId, forcar } });
}

export async function registrarFeedback(versaoId: string, util: boolean, motivo?: string | null, denuncia = false): Promise<{ curtidas?: number; descurtidas?: number } | null> {
  const { data, error } = await supabase.rpc("expl_registrar_feedback", {
    _versao_id: versaoId, _util: util, _motivo: motivo ?? null, _denuncia: denuncia,
  });
  if (error) return null;
  return (data as { curtidas: number; descurtidas: number }) ?? null;
}
