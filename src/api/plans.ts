/**
 * Camada de Plano Diário — Fase 13A.
 * Consome exclusivamente RPCs oficiais `plan_generate_today` e `plan_mark_item`.
 * Acesso direto às tabelas `study_plans` / `study_plan_items` eliminado.
 */
import { supabase } from "@/lib/supabase";

export type StudyPlanRow = Record<string, unknown> & { id: string };
export type StudyPlanItemRow = Record<string, unknown> & { id: string };

export interface TodayPlanResult {
  plan: StudyPlanRow | null;
  items: StudyPlanItemRow[];
  generated: number;
}

export async function fetchTodayPlan(): Promise<TodayPlanResult> {
  const { data, error } = await supabase.rpc("plan_generate_today");
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    plan: (src.plan ?? null) as StudyPlanRow | null,
    items: (src.items ?? []) as StudyPlanItemRow[],
    generated: Number(src.generated ?? 0),
  };
}

export async function markPlanItem(
  itemId: string,
  patch: { completed?: boolean; time_spent_min?: number | null; notes?: string | null } = {},
): Promise<StudyPlanItemRow> {
  const { data, error } = await supabase.rpc("plan_mark_item", {
    _item_id: itemId,
    _completed: patch.completed ?? true,
    _time_spent_min: patch.time_spent_min ?? null,
    _notes: patch.notes ?? null,
  });
  if (error) throw error;
  return data as StudyPlanItemRow;
}
