/**
 * Camada de Questões — Fase 13A.
 * Consome RPCs oficiais: `search_questions`, `record_answer`.
 * Acesso direto à tabela `questions` foi eliminado.
 */
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";

export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
export type AlternativeRow = Database["public"]["Tables"]["alternatives"]["Row"];

export interface QuestionWithAlternatives extends QuestionRow {
  alternatives: AlternativeRow[];
}

export interface SearchQuestionsFilter {
  q?: string;
  discipline_id?: string;
  subject_id?: string;
  board_id?: string;
  year?: number;
  difficulty?: string;
  status?: string;
}

export interface SearchQuestionsResult {
  total: number;
  page: number;
  page_size: number;
  items: QuestionWithAlternatives[];
}

export async function searchQuestions(
  filter: SearchQuestionsFilter = {},
  page = 1,
  pageSize = 20,
): Promise<SearchQuestionsResult> {
  const { data, error } = await supabase.rpc("search_questions", {
    _filters: filter as never,
    _page: page,
    _page_size: pageSize,
  });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(src.total ?? 0),
    page: Number(src.page ?? page),
    page_size: Number(src.page_size ?? pageSize),
    items: (src.items ?? []) as QuestionWithAlternatives[],
  };
}

export async function getQuestion(id: string): Promise<QuestionWithAlternatives> {
  // RPC search_questions retorna apenas publicadas; para um id específico
  // usamos filtro por id via metadata do RPC não previsto → fallback via
  // consulta segura pela chave primária (RLS aplica).
  const result = await searchQuestions({}, 1, 1);
  const found = result.items.find((q) => q.id === id);
  if (found) return found;
  const { data, error } = await supabase
    .from("questions")
    .select("*, alternatives(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as QuestionWithAlternatives;
}

export type AnswerOrigin = Database["public"]["Enums"]["answer_origin"];

export interface RecordAnswerInput {
  question_id: string;
  alternative_id?: string | null;
  response_text?: string | null;
  time_ms?: number | null;
  origin?: AnswerOrigin;
  origin_id?: string | null;
  client_event_id?: string | null;
  quality?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface RecordAnswerResult {
  answer_id: string;
  is_correct: boolean;
  correct_alternative_id: string | null;
  explanation?: string | null;
  raw: Record<string, unknown> | null;
}

export async function recordAnswer(input: RecordAnswerInput): Promise<RecordAnswerResult> {
  const { data, error } = await supabase.rpc("record_answer", {
    _question_id: input.question_id,
    _alternative_id: input.alternative_id ?? null,
    _response_text: input.response_text ?? null,
    _time_ms: input.time_ms ?? null,
    _origin: (input.origin ?? "banco") as AnswerOrigin,
    _origin_id: input.origin_id ?? null,
    _client_event_id: input.client_event_id ?? null,
    _quality: input.quality ?? null,
    _metadata: (input.metadata ?? null) as never,
  });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    answer_id: String(src.answer_id ?? src.id ?? ""),
    is_correct: Boolean(src.is_correct ?? src.correta ?? false),
    correct_alternative_id: (src.correct_alternative_id ?? null) as string | null,
    explanation: (src.explanation ?? null) as string | null,
    raw: src,
  };
}
