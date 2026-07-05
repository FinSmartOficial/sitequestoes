/**
 * Sistema Oficial de Revisão Espaçada — Fase 22C.
 *
 * Camada única de acesso ao motor SM-2. Nenhum componente deve consumir a
 * tabela `question_reviews` diretamente; toda leitura/escrita passa pelas
 * RPCs oficiais:
 *   - review_schedule
 *   - review_due_today
 *   - review_register_answer
 *   - review_statistics
 *   - review_reset_question
 */
import { supabase } from "@/lib/supabase";

// ---------------- RPC registry ----------------

export const REVIEW_RPC = {
  schedule: "review_schedule",
  dueToday: "review_due_today",
  registerAnswer: "review_register_answer",
  statistics: "review_statistics",
  resetQuestion: "review_reset_question",
} as const;

export type ReviewRpcName = (typeof REVIEW_RPC)[keyof typeof REVIEW_RPC];

// ---------------- DTOs ----------------

export type ReviewResult = "correct" | "incorrect";

export interface ReviewScheduleItemDTO {
  readonly id: string;
  readonly question_id: string;
  readonly next_review: string;
  readonly interval_days: number;
  readonly repetitions: number;
  readonly easiness_factor: number;
  readonly last_result: ReviewResult | null;
}

export interface ReviewDueItemDTO extends ReviewScheduleItemDTO {
  readonly overdue_days: number;
}

export interface RegisterReviewResultDTO {
  readonly id: string;
  readonly repetitions: number;
  readonly easiness_factor: number;
  readonly interval_days: number;
  readonly next_review: string;
  readonly last_result: ReviewResult;
}

export interface ReviewStatisticsDTO {
  readonly total_in_review: number;
  readonly overdue_count: number;
  readonly studied_today: number;
  readonly upcoming_7d: number;
  readonly retention_rate: number;
  readonly avg_interval_days: number;
  readonly avg_easiness_factor: number;
}

// ---------------- Filtros ----------------

export interface ScheduleFilters {
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
}

export interface DueFilters {
  readonly limit?: number;
}

// ---------------- Normalização ----------------

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSchedule(row: unknown): ReviewScheduleItemDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    question_id: String(r.question_id ?? ""),
    next_review: String(r.next_review ?? ""),
    interval_days: toNum(r.interval_days),
    repetitions: toNum(r.repetitions),
    easiness_factor: toNum(r.easiness_factor, 2.5),
    last_result: (r.last_result as ReviewResult | null) ?? null,
  };
}

function normalizeDue(row: unknown): ReviewDueItemDTO {
  const base = normalizeSchedule(row);
  const r = (row ?? {}) as Record<string, unknown>;
  return { ...base, overdue_days: toNum(r.overdue_days) };
}

function normalizeRegister(row: unknown): RegisterReviewResultDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    repetitions: toNum(r.repetitions),
    easiness_factor: toNum(r.easiness_factor, 2.5),
    interval_days: toNum(r.interval_days),
    next_review: String(r.next_review ?? ""),
    last_result: (r.last_result as ReviewResult) ?? "correct",
  };
}

function normalizeStats(row: unknown): ReviewStatisticsDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    total_in_review: toNum(r.total_in_review),
    overdue_count: toNum(r.overdue_count),
    studied_today: toNum(r.studied_today),
    upcoming_7d: toNum(r.upcoming_7d),
    retention_rate: toNum(r.retention_rate),
    avg_interval_days: toNum(r.avg_interval_days),
    avg_easiness_factor: toNum(r.avg_easiness_factor, 2.5),
  };
}

// ---------------- Fetchers ----------------

// Nota: as RPCs foram criadas na Fase 22C. Enquanto o `types.ts` gerado não
// as inclui, usamos um cast local restrito a este módulo — sem `any`.
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const rpcClient = supabase as unknown as RpcClient;

export async function fetchReviewSchedule(filters: ScheduleFilters = {}): Promise<ReviewScheduleItemDTO[]> {
  const args: Record<string, unknown> = {};
  if (filters.from) args._from = filters.from;
  if (filters.to) args._to = filters.to;
  if (filters.limit) args._limit = filters.limit;
  const { data, error } = await rpcClient.rpc(REVIEW_RPC.schedule, args);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeSchedule);
}

export async function fetchReviewsDueToday(filters: DueFilters = {}): Promise<ReviewDueItemDTO[]> {
  const args: Record<string, unknown> = {};
  if (filters.limit) args._limit = filters.limit;
  const { data, error } = await rpcClient.rpc(REVIEW_RPC.dueToday, args);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeDue);
}

export async function registerReviewAnswer(
  questionId: string,
  isCorrect: boolean,
): Promise<RegisterReviewResultDTO> {
  const { data, error } = await rpcClient.rpc(REVIEW_RPC.registerAnswer, {
    _question_id: questionId,
    _is_correct: isCorrect,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeRegister(row);
}

export async function fetchReviewStatistics(): Promise<ReviewStatisticsDTO> {
  const { data, error } = await rpcClient.rpc(REVIEW_RPC.statistics);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeStats(row);
}

export async function resetReviewQuestion(questionId: string): Promise<boolean> {
  const { data, error } = await rpcClient.rpc(REVIEW_RPC.resetQuestion, {
    _question_id: questionId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
