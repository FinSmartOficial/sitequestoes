/**
 * Question Engine — motor oficial de seleção de questões (Fase 22B).
 *
 * Camada única de acesso às RPCs `question_engine_*`. Nenhum componente ou
 * hook deve consultar `questions` diretamente; toda seleção passa por aqui.
 *
 * RPCs consumidas:
 *   - question_engine_random
 *   - question_engine_by_subject
 *   - question_engine_review
 *   - question_engine_daily
 *   - question_engine_simulation
 *   - question_engine_adaptive
 */
import { supabase } from "@/lib/supabase";

// ---------------- RPC registry ----------------

export const QUESTION_ENGINE_RPC = {
  random: "question_engine_random",
  bySubject: "question_engine_by_subject",
  review: "question_engine_review",
  daily: "question_engine_daily",
  simulation: "question_engine_simulation",
  adaptive: "question_engine_adaptive",
} as const;

export type QuestionEngineRpcName =
  (typeof QUESTION_ENGINE_RPC)[keyof typeof QUESTION_ENGINE_RPC];

// ---------------- DTOs ----------------

export type QuestionDifficulty =
  | "very_easy"
  | "easy"
  | "medium"
  | "hard"
  | "very_hard";

/** Item retornado pelo motor. Payload padronizado entre todas as RPCs. */
export interface EngineQuestionDTO {
  readonly question_id: string;
  readonly discipline_id: string | null;
  readonly subject_id: string | null;
  readonly difficulty: QuestionDifficulty;
  readonly code: string | null;
  readonly statement: string;
  readonly answered_count: number;
  readonly wrong_count: number;
  readonly last_answered_at: string | null;
  readonly accuracy: number | null;
  readonly score: number;
}

// ---------------- Filtros ----------------

export interface RandomFilters {
  readonly limit?: number;
  readonly disciplineIds?: readonly string[];
  readonly subjectIds?: readonly string[];
  readonly difficulty?: readonly QuestionDifficulty[];
  readonly excludeIds?: readonly string[];
}

export interface BySubjectFilters {
  readonly disciplineId: string;
  readonly subjectId?: string;
  readonly limit?: number;
  readonly difficulty?: readonly QuestionDifficulty[];
  readonly excludeIds?: readonly string[];
}

export interface ReviewFilters {
  readonly limit?: number;
}

export interface DailyFilters {
  readonly limit?: number;
  readonly priorityDisciplines?: readonly string[];
}

export interface SimulationFilters {
  readonly limit?: number;
  readonly disciplineIds?: readonly string[];
  readonly difficulty?: readonly QuestionDifficulty[];
  readonly excludeIds?: readonly string[];
}

export interface AdaptiveFilters {
  readonly limit?: number;
  readonly priorityDisciplines?: readonly string[];
}

// ---------------- Internals ----------------

const asArray = <T>(v: readonly T[] | undefined): T[] | undefined =>
  v && v.length > 0 ? [...v] : undefined;

function normalize(payload: unknown): EngineQuestionDTO[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(
    (row): row is EngineQuestionDTO =>
      typeof row === "object" && row !== null && "question_id" in row,
  );
}

async function callEngine(
  name: QuestionEngineRpcName,
  args: Record<string, unknown>,
): Promise<EngineQuestionDTO[]> {
  const { data, error } = await supabase.rpc(
    name,
    args as never,
  );
  if (error) throw new Error(error.message);
  return normalize(data);
}

// ---------------- Fetchers ----------------

export function fetchRandomQuestions(
  f: RandomFilters = {},
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.random, {
    p_limit: f.limit ?? 10,
    p_discipline_ids: asArray(f.disciplineIds),
    p_subject_ids: asArray(f.subjectIds),
    p_difficulty: asArray(f.difficulty),
    p_exclude_ids: asArray(f.excludeIds),
  });
}

export function fetchBySubjectQuestions(
  f: BySubjectFilters,
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.bySubject, {
    p_discipline_id: f.disciplineId,
    p_subject_id: f.subjectId,
    p_limit: f.limit ?? 10,
    p_difficulty: asArray(f.difficulty),
    p_exclude_ids: asArray(f.excludeIds),
  });
}

export function fetchReviewQuestions(
  f: ReviewFilters = {},
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.review, {
    p_limit: f.limit ?? 20,
  });
}

export function fetchDailyQuestions(
  f: DailyFilters = {},
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.daily, {
    p_limit: f.limit ?? 15,
    p_priority_disciplines: asArray(f.priorityDisciplines),
  });
}

export function fetchSimulationQuestions(
  f: SimulationFilters = {},
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.simulation, {
    p_limit: f.limit ?? 20,
    p_discipline_ids: asArray(f.disciplineIds),
    p_difficulty: asArray(f.difficulty),
    p_exclude_ids: asArray(f.excludeIds),
  });
}

export function fetchAdaptiveQuestions(
  f: AdaptiveFilters = {},
): Promise<EngineQuestionDTO[]> {
  return callEngine(QUESTION_ENGINE_RPC.adaptive, {
    p_limit: f.limit ?? 10,
    p_priority_disciplines: asArray(f.priorityDisciplines),
  });
}
