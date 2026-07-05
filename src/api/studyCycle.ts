/**
 * Camada oficial do domínio Ciclo de Estudos — Fase 14D.
 * Toda comunicação com o backend (RPCs, tabelas) deve passar por este módulo.
 */
import { supabase } from "@/lib/supabase";

// ============= DTOs =============

export interface StudyCycle {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  status: "active" | "paused" | "archived";
  current_position: number;
  total_disciplines: number;
  estimated_daily_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface StudyCycleDiscipline {
  id: string;
  cycle_id: string;
  discipline_id?: string | null;
  discipline: string;
  position: number;
  study_minutes: number;
  questions_goal: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudyCycleSession {
  id: string;
  cycle_id: string;
  cycle_discipline_id: string | null;
  discipline: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  planned_minutes: number;
  studied_minutes: number;
  questions_answered: number;
  correct_answers: number;
  wrong_answers: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyCycleProgress {
  id: string;
  cycle_id: string;
  user_id: string;
  current_discipline_id: string | null;
  current_position: number;
  completed_cycles: number;
  last_session: string | null;
  current_streak: number;
  current_session_started_at?: string | null;
  updated_at: string;
}

export interface DisciplineDraft {
  id?: string;
  discipline_id?: string | null;
  discipline: string;
  study_minutes: number;
  questions_goal: number;
  enabled?: boolean;
}

export interface StudyCyclePayload {
  name: string;
  description?: string;
  estimated_daily_minutes?: number;
  disciplines: DisciplineDraft[];
  is_default?: boolean;
}

export interface StudyCycleSessionInput {
  cycle_id: string;
  cycle_discipline_id: string;
  discipline: string;
  planned_minutes: number;
  studied_minutes: number;
  questions_answered?: number;
  correct_answers?: number;
  wrong_answers?: number;
  completed?: boolean;
  advance?: boolean;
}

export interface StudyCycleAdvanceResult {
  ok: boolean;
  position?: number;
  discipline_id?: string | null;
  completed_cycle?: boolean;
  reason?: string;
}

export interface StudyCycleStartResult {
  ok: boolean;
  started_at?: string;
  position?: number;
  discipline_id?: string | null;
  reason?: string;
}

export interface StudyCycleStats {
  plannedMinutes: number;
  studiedMinutes: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  precision: number;
  completedSessions: number;
  averageMinutes: number;
  weeklyHistory: Array<{ day: string; minutes: number; questions: number }>;
}

export interface StudyState {
  cycles: StudyCycle[];
  disciplines: Record<string, StudyCycleDiscipline[]>;
  progress: Record<string, StudyCycleProgress>;
  sessions: Record<string, StudyCycleSession[]>;
}

// ============= Helpers =============

function normalizeDisciplines(items: DisciplineDraft[]) {
  return items
    .map((item) => ({
      id: item.id,
      discipline_id: item.discipline_id ?? null,
      discipline: item.discipline.trim(),
      study_minutes: Math.max(5, Math.round(Number(item.study_minutes) || 30)),
      questions_goal: Math.max(0, Math.round(Number(item.questions_goal) || 0)),
      enabled: item.enabled ?? true,
    }))
    .filter((item) => item.discipline.length > 0);
}

export function computeStatsFor(
  state: StudyState,
): Record<string, StudyCycleStats> {
  const out: Record<string, StudyCycleStats> = {};
  for (const cycle of state.cycles) {
    const cycleSessions = state.sessions[cycle.id] ?? [];
    const cycleDisciplines =
      state.disciplines[cycle.id]?.filter((d) => d.enabled) ?? [];
    const plannedMinutes = cycleDisciplines.reduce(
      (sum, d) => sum + d.study_minutes,
      0,
    );
    const studiedMinutes = cycleSessions.reduce(
      (sum, s) => sum + (s.studied_minutes ?? 0),
      0,
    );
    const questionsAnswered = cycleSessions.reduce(
      (sum, s) => sum + (s.questions_answered ?? 0),
      0,
    );
    const correctAnswers = cycleSessions.reduce(
      (sum, s) => sum + (s.correct_answers ?? 0),
      0,
    );
    const wrongAnswers = cycleSessions.reduce(
      (sum, s) => sum + (s.wrong_answers ?? 0),
      0,
    );
    const weekly = new Map<
      string,
      { day: string; minutes: number; questions: number }
    >();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().slice(0, 10);
      weekly.set(day, { day, minutes: 0, questions: 0 });
    }
    for (const session of cycleSessions) {
      const day = (session.finished_at ?? session.started_at).slice(0, 10);
      const row = weekly.get(day);
      if (row) {
        row.minutes += session.studied_minutes ?? 0;
        row.questions += session.questions_answered ?? 0;
      }
    }
    out[cycle.id] = {
      plannedMinutes,
      studiedMinutes,
      questionsAnswered,
      correctAnswers,
      wrongAnswers,
      precision:
        questionsAnswered > 0
          ? Math.round((correctAnswers / questionsAnswered) * 100)
          : 0,
      completedSessions: cycleSessions.filter((s) => s.completed).length,
      averageMinutes:
        cycleSessions.length > 0
          ? Math.round(studiedMinutes / cycleSessions.length)
          : 0,
      weeklyHistory: Array.from(weekly.values()),
    };
  }
  return out;
}

// ============= Queries =============

export async function loadAllForUser(userId: string): Promise<StudyState> {
  const { data: cs, error } = await supabase
    .from("study_cycles")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const cycles = (cs ?? []) as StudyCycle[];
  const ids = cycles.map((c) => c.id);
  if (!ids.length) {
    return { cycles, disciplines: {}, progress: {}, sessions: {} };
  }
  const [{ data: ds }, { data: ps }, { data: ss }] = await Promise.all([
    supabase
      .from("study_cycle_disciplines")
      .select("*")
      .in("cycle_id", ids)
      .order("position", { ascending: true }),
    supabase.from("study_cycle_progress").select("*").in("cycle_id", ids),
    supabase
      .from("study_cycle_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("cycle_id", ids)
      .order("started_at", { ascending: false })
      .limit(500),
  ]);
  const disciplines: Record<string, StudyCycleDiscipline[]> = {};
  for (const d of (ds ?? []) as StudyCycleDiscipline[]) {
    (disciplines[d.cycle_id] ||= []).push(d);
  }
  const progress: Record<string, StudyCycleProgress> = {};
  for (const p of (ps ?? []) as StudyCycleProgress[]) progress[p.cycle_id] = p;
  const sessions: Record<string, StudyCycleSession[]> = {};
  for (const s of (ss ?? []) as StudyCycleSession[]) {
    (sessions[s.cycle_id] ||= []).push(s);
  }
  return { cycles, disciplines, progress, sessions };
}

// ============= Mutations =============

export async function createCycle(
  userId: string,
  input: StudyCyclePayload,
): Promise<StudyCycle> {
  const cleaned = normalizeDisciplines(input.disciplines);
  if (!input.name.trim() || cleaned.length === 0) {
    throw new Error("Preencha o nome e as disciplinas do ciclo");
  }
  if (input.is_default) {
    await supabase
      .from("study_cycles")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
  }
  const { data: c, error } = await supabase
    .from("study_cycles")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description ?? null,
      estimated_daily_minutes: input.estimated_daily_minutes ?? 60,
      total_disciplines: cleaned.filter((d) => d.enabled).length,
      is_default: !!input.is_default,
    })
    .select()
    .single();
  if (error || !c) throw error ?? new Error("Erro ao criar ciclo");
  if (cleaned.length) {
    const rows = cleaned.map((d, i) => ({
      cycle_id: c.id,
      discipline_id: d.discipline_id,
      discipline: d.discipline,
      position: i,
      study_minutes: d.study_minutes,
      questions_goal: d.questions_goal,
      enabled: d.enabled,
    }));
    const { error: e2 } = await supabase
      .from("study_cycle_disciplines")
      .insert(rows);
    if (e2) {
      await supabase.from("study_cycles").delete().eq("id", c.id).eq("user_id", userId);
      throw e2;
    }
  }
  await supabase.rpc("study_cycle_ensure_progress", { p_cycle: c.id });
  return c as StudyCycle;
}

export async function removeCycle(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("study_cycles")
    .update({ status: "archived", is_default: false })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setDefaultCycle(userId: string, id: string): Promise<void> {
  await supabase
    .from("study_cycles")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  const { error } = await supabase
    .from("study_cycles")
    .update({ is_default: true, status: "active" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateCycle(
  userId: string,
  id: string,
  input: StudyCyclePayload,
  existingDisciplines: StudyCycleDiscipline[],
  currentProgress: StudyCycleProgress | undefined,
): Promise<void> {
  const cleaned = normalizeDisciplines(input.disciplines);
  if (!input.name.trim() || cleaned.length === 0) {
    throw new Error("Preencha o nome e as disciplinas do ciclo");
  }

  if (input.is_default) {
    await supabase
      .from("study_cycles")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true)
      .neq("id", id);
  }

  const existingById = new Map(existingDisciplines.map((item) => [item.id, item]));
  const enabledTotal = cleaned.filter((d) => d.enabled).length;
  const { error: cycleError } = await supabase
    .from("study_cycles")
    .update({
      name: input.name.trim(),
      description: input.description ?? null,
      estimated_daily_minutes: input.estimated_daily_minutes ?? 60,
      total_disciplines: enabledTotal,
      is_default: !!input.is_default,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (cycleError) throw cycleError;

  await Promise.all(
    existingDisciplines.map((item, index) =>
      supabase
        .from("study_cycle_disciplines")
        .update({ position: 100000 + index })
        .eq("id", item.id)
        .eq("cycle_id", id),
    ),
  );

  const keptIds = new Set<string>();
  for (const [index, item] of cleaned.entries()) {
    if (item.id && existingById.has(item.id)) {
      keptIds.add(item.id);
      const { error: updateError } = await supabase
        .from("study_cycle_disciplines")
        .update({
          discipline_id: item.discipline_id,
          discipline: item.discipline,
          position: index,
          study_minutes: item.study_minutes,
          questions_goal: item.questions_goal,
          enabled: item.enabled,
        })
        .eq("id", item.id)
        .eq("cycle_id", id);
      if (updateError) throw updateError;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("study_cycle_disciplines")
        .insert({
          cycle_id: id,
          discipline_id: item.discipline_id,
          discipline: item.discipline,
          position: index,
          study_minutes: item.study_minutes,
          questions_goal: item.questions_goal,
          enabled: item.enabled,
        })
        .select("id")
        .single();
      if (insertError || !inserted) {
        throw insertError ?? new Error("Erro ao adicionar disciplina");
      }
      keptIds.add(inserted.id);
    }
  }

  const removed = existingDisciplines.filter((item) => !keptIds.has(item.id));
  await Promise.all(
    removed.map((item, index) =>
      supabase
        .from("study_cycle_disciplines")
        .update({ enabled: false, position: 200000 + index })
        .eq("id", item.id)
        .eq("cycle_id", id),
    ),
  );

  const currentIndex = currentProgress?.current_discipline_id
    ? cleaned.findIndex(
        (item) =>
          item.enabled !== false &&
          item.id === currentProgress.current_discipline_id &&
          keptIds.has(currentProgress.current_discipline_id!),
      )
    : -1;

  if (currentIndex >= 0 && currentProgress?.current_discipline_id) {
    await supabase
      .from("study_cycle_progress")
      .update({
        current_position: currentIndex,
        current_discipline_id: currentProgress.current_discipline_id,
      })
      .eq("cycle_id", id)
      .eq("user_id", userId);
    await supabase
      .from("study_cycles")
      .update({ current_position: currentIndex, total_disciplines: enabledTotal })
      .eq("id", id)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("study_cycle_progress")
      .update({ current_discipline_id: null })
      .eq("cycle_id", id)
      .eq("user_id", userId);
    await supabase.rpc("study_cycle_ensure_progress", { p_cycle: id });
  }
}

export async function duplicateCycle(
  userId: string,
  source: StudyCycle,
  sourceDisciplines: StudyCycleDiscipline[],
): Promise<StudyCycle> {
  return createCycle(userId, {
    name: `${source.name} (cópia)`,
    description: source.description ?? undefined,
    estimated_daily_minutes: source.estimated_daily_minutes,
    is_default: false,
    disciplines: sourceDisciplines.map((discipline) => ({
      id: undefined,
      discipline_id: discipline.discipline_id,
      discipline: discipline.discipline,
      study_minutes: discipline.study_minutes,
      questions_goal: discipline.questions_goal,
      enabled: discipline.enabled,
    })),
  });
}

export async function advanceCycle(
  cycleId: string,
): Promise<StudyCycleAdvanceResult> {
  const { data, error } = await supabase.rpc("study_cycle_advance", {
    p_cycle: cycleId,
  });
  if (error) throw error;
  return data as StudyCycleAdvanceResult;
}

export async function ensureProgress(
  cycleId: string,
): Promise<StudyCycleAdvanceResult> {
  const { data, error } = await supabase.rpc("study_cycle_ensure_progress", {
    p_cycle: cycleId,
  });
  if (error) throw error;
  return data as StudyCycleAdvanceResult;
}

export async function startSession(
  cycleId: string,
  cycleDisciplineId?: string | null,
): Promise<StudyCycleStartResult> {
  const { data, error } = await supabase.rpc("study_cycle_start_session", {
    p_cycle: cycleId,
    p_cycle_discipline: cycleDisciplineId ?? null,
  });
  if (error) throw error;
  return data as StudyCycleStartResult;
}

export async function registerSession(
  input: StudyCycleSessionInput,
): Promise<unknown> {
  const { data, error } = await supabase.rpc("study_cycle_register_session", {
    p_cycle: input.cycle_id,
    p_cycle_discipline: input.cycle_discipline_id,
    p_discipline: input.discipline,
    p_planned_minutes: input.planned_minutes,
    p_studied_minutes: input.studied_minutes,
    p_questions_answered: input.questions_answered ?? 0,
    p_correct_answers: input.correct_answers ?? 0,
    p_wrong_answers: input.wrong_answers ?? 0,
    p_completed: input.completed ?? true,
    p_advance: input.advance ?? true,
  });
  if (error) throw error;
  return data;
}
