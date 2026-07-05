/**
 * Camada de Revisão (SRS) — Fase 13A.
 * Consome exclusivamente RPCs oficiais `review_today_queue` e `record_answer`
 * (com `_origin='review'` e `_quality`). Acesso direto à tabela `reviews` eliminado.
 */
import { supabase } from "@/lib/supabase";
import { recordAnswer, type RecordAnswerInput, type RecordAnswerResult } from "./questions";

export interface ReviewQueueItem {
  review_id: string;
  question_id: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
  last_quality: number | null;
  overdue_days: number;
}

export interface ReviewQueue {
  total: number;
  items: ReviewQueueItem[];
}

export async function fetchTodayReviewQueue(limit = 50): Promise<ReviewQueue> {
  const { data, error } = await supabase.rpc("review_today_queue", { _limit: limit });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(src.total ?? 0),
    items: (src.items ?? []) as ReviewQueueItem[],
  };
}

/**
 * Registra resposta de revisão via RPC oficial `record_answer`.
 * A lógica SM-2 permanece no backend (trigger analytics + helper apply_sm2).
 */
export async function registerReviewAnswer(
  input: Omit<RecordAnswerInput, "origin"> & { review_id?: string | null; quality?: number | null },
): Promise<RecordAnswerResult> {
  return recordAnswer({
    ...input,
    origin: "review",
    origin_id: input.review_id ?? null,
  });
}
