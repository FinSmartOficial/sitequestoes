/**
 * Missões Inteligentes Adaptativas — Fase 22D.
 *
 * Camada única de acesso ao motor de missões. Nenhum componente deve
 * consumir a tabela `user_missions` diretamente; todas as operações passam
 * pelas RPCs oficiais:
 *   - missions_generate
 *   - mission_progress
 *   - mission_claim
 *   - mission_statistics
 */
import { supabase } from "@/lib/supabase";

// ---------------- RPC registry ----------------

export const MISSIONS_RPC = {
  generate: "missions_generate",
  progress: "mission_progress",
  claim: "mission_claim",
  statistics: "mission_statistics",
} as const;

export type MissionsRpcName = (typeof MISSIONS_RPC)[keyof typeof MISSIONS_RPC];

// ---------------- DTOs ----------------

export type MissionType =
  | "answer_questions"
  | "correct_questions"
  | "review_overdue"
  | "study_minutes"
  | "complete_session"
  | "complete_simulation"
  | "keep_streak"
  | "review_forgotten_discipline"
  | "study_priority_discipline"
  | "complete_daily_plan";

export type MissionPeriod = "daily" | "weekly";
export type MissionDifficulty = "easy" | "medium" | "hard";

export interface MissionDTO {
  readonly id: string;
  readonly mission_type: MissionType;
  readonly period: MissionPeriod;
  readonly title: string;
  readonly description: string;
  readonly target: number;
  readonly xp_reward: number;
  readonly coin_reward: number;
  readonly priority: number;
  readonly difficulty: MissionDifficulty;
  readonly expires_at: string;
}

export interface MissionProgressDTO {
  readonly id: string;
  readonly progress: number;
  readonly target: number;
  readonly completed_at: string | null;
  readonly expires_at: string;
}

export interface MissionClaimDTO {
  readonly id: string;
  readonly xp_awarded: number;
  readonly coin_awarded: number;
  readonly claimed_at: string;
}

export interface MissionStatisticsDTO {
  readonly missions_today: number;
  readonly completed_today: number;
  readonly claimed_today: number;
  readonly xp_earned_today: number;
  readonly streak_days: number;
  readonly completion_rate: number;
}

// ---------------- Normalização ----------------

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMission(row: unknown): MissionDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    mission_type: (r.mission_type as MissionType) ?? "answer_questions",
    period: (r.period as MissionPeriod) ?? "daily",
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    target: toNum(r.target, 1),
    xp_reward: toNum(r.xp_reward),
    coin_reward: toNum(r.coin_reward),
    priority: toNum(r.priority, 50),
    difficulty: (r.difficulty as MissionDifficulty) ?? "medium",
    expires_at: String(r.expires_at ?? ""),
  };
}

function normalizeProgress(row: unknown): MissionProgressDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    progress: toNum(r.progress),
    target: toNum(r.target, 1),
    completed_at: (r.completed_at as string | null) ?? null,
    expires_at: String(r.expires_at ?? ""),
  };
}

function normalizeClaim(row: unknown): MissionClaimDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    xp_awarded: toNum(r.xp_awarded),
    coin_awarded: toNum(r.coin_awarded),
    claimed_at: String(r.claimed_at ?? ""),
  };
}

function normalizeStats(row: unknown): MissionStatisticsDTO {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    missions_today: toNum(r.missions_today),
    completed_today: toNum(r.completed_today),
    claimed_today: toNum(r.claimed_today),
    xp_earned_today: toNum(r.xp_earned_today),
    streak_days: toNum(r.streak_days),
    completion_rate: toNum(r.completion_rate),
  };
}

// ---------------- Fetchers ----------------

// As RPCs foram criadas na Fase 22D; enquanto `types.ts` não é regenerado,
// usamos um cast local restrito — sem `any`.
type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = supabase as unknown as RpcClient;

export async function generateMissions(force = false): Promise<MissionDTO[]> {
  const { data, error } = await rpcClient.rpc(MISSIONS_RPC.generate, { _force: force });
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeMission);
}

/** Lista missões vigentes filtrando por período no cliente. */
export async function fetchMissionsByPeriod(period: MissionPeriod): Promise<MissionDTO[]> {
  const all = await generateMissions(false);
  return all.filter((m) => m.period === period);
}

export async function fetchDailyMissions(): Promise<MissionDTO[]> {
  return fetchMissionsByPeriod("daily");
}

export async function fetchWeeklyMissions(): Promise<MissionDTO[]> {
  return fetchMissionsByPeriod("weekly");
}

export async function updateMissionProgress(missionId: string, delta = 1): Promise<MissionProgressDTO | null> {
  const { data, error } = await rpcClient.rpc(MISSIONS_RPC.progress, {
    _mission_id: missionId,
    _delta: delta,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeProgress(row) : null;
}

export async function claimMission(missionId: string): Promise<MissionClaimDTO> {
  const { data, error } = await rpcClient.rpc(MISSIONS_RPC.claim, { _mission_id: missionId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeClaim(row);
}

export async function fetchMissionStatistics(): Promise<MissionStatisticsDTO> {
  const { data, error } = await rpcClient.rpc(MISSIONS_RPC.statistics);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeStats(row);
}
