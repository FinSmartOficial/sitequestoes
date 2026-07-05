/**
 * Hooks React Query padronizados — Fase 13.
 * Componentes devem importar destes hooks em vez de chamar supabase diretamente.
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { qk } from "./keys";
import * as auth from "./auth";
import * as profileApi from "./profile";
import * as dashboardApi from "./dashboard";
import * as questionsApi from "./questions";
import * as notebooksApi from "./notebooks";
import * as reviewApi from "./review";
import * as plansApi from "./plans";
import * as gamificationApi from "./gamification";
import * as xpApi from "./xp";
import * as rankingsApi from "./rankings";
import * as friendsApi from "./friends";
import * as notificationsApi from "./notifications";
import * as arenaApi from "./arena";
import * as simulationsApi from "./simulations";
import * as studyCycleApi from "./studyCycle";
import * as examsApi from "./exams";
import { toast } from "sonner";
import { useMemo } from "react";

// ---------------- Auth ----------------

export function useSignIn() {
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      auth.signInWithPassword(v.email, v.password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (v: { email: string; password: string; nome?: string }) =>
      auth.signUpWithPassword(v.email, v.password, { nome: v.nome }),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => auth.resetPasswordForEmail(email),
  });
}

// ---------------- Profile ----------------

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.profile.me(user?.id),
    queryFn: () => profileApi.getMyProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useUpdateMyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof profileApi.updateMyProfile>[1]) =>
      profileApi.updateMyProfile(user!.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile.me(user?.id) }),
  });
}

// ---------------- Dashboard ----------------

export function useDashboardSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.dashboard.summary(user?.id),
    queryFn: dashboardApi.fetchDashboardSummary,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useDashboardHeatmap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.dashboard.heatmap(user?.id),
    queryFn: dashboardApi.fetchHeatmap,
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useDashboardByDiscipline() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.dashboard.byDiscipline(user?.id),
    queryFn: dashboardApi.fetchByDiscipline,
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useRankingPosition(slug: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.dashboard.rankingPosition(slug, user?.id),
    queryFn: () => dashboardApi.fetchRankingPosition(slug),
    enabled: !!user?.id && !!slug,
    staleTime: 60_000,
  });
}

// ---------------- Questions ----------------

export function useQuestions(filter: questionsApi.SearchQuestionsFilter = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...qk.questions.list(filter as Record<string, unknown>), page, pageSize],
    queryFn: () => questionsApi.searchQuestions(filter, page, pageSize),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useQuestion(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.questions.byId(id ?? ""),
    queryFn: () => questionsApi.getQuestion(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAnswerQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: questionsApi.RecordAnswerInput) => questionsApi.recordAnswer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
    retry: 1,
  });
}

// ---------------- Notebooks ----------------

export function useNotebooks(includeArchived = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.notebooks.list(user?.id, includeArchived),
    queryFn: () => notebooksApi.listNotebooks({ includeArchived }),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useNotebook(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.notebooks.byId(id ?? ""),
    queryFn: () => notebooksApi.getNotebook(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useNotebookQuestions(id: string | null | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...qk.notebooks.questions(id ?? ""), page, pageSize],
    queryFn: () => notebooksApi.listNotebookQuestions(id!, page, pageSize),
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof notebooksApi.createNotebook>[0]) =>
      notebooksApi.createNotebook(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebooks"] }),
  });
}

export function useUpdateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; patch: Parameters<typeof notebooksApi.updateNotebook>[1] }) =>
      notebooksApi.updateNotebook(v.id, v.patch),
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ["notebooks"] });
      qc.invalidateQueries({ queryKey: qk.notebooks.byId(v.id) });
    },
  });
}

export function useDeleteNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notebooksApi.deleteNotebook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebooks"] }),
  });
}

export function useAddQuestionToNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { notebookId: string; questionId: string }) =>
      notebooksApi.addQuestionToNotebook(v.notebookId, v.questionId),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.notebooks.questions(v.notebookId) }),
  });
}

export function useRemoveQuestionFromNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { notebookId: string; questionId: string }) =>
      notebooksApi.removeQuestionFromNotebook(v.notebookId, v.questionId),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.notebooks.questions(v.notebookId) }),
  });
}

// ---------------- Review (SRS) ----------------

export function useReviewQueue(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.review.queue(user?.id, limit),
    queryFn: () => reviewApi.fetchTodayReviewQueue(limit),
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}

export function useReviewAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof reviewApi.registerReviewAnswer>[0]) =>
      reviewApi.registerReviewAnswer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    retry: 1,
  });
}

// ---------------- Plano Diário ----------------

export function useTodayPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.plans.today(user?.id),
    queryFn: () => plansApi.fetchTodayPlan(),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useCompletePlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { itemId: string; completed?: boolean; time_spent_min?: number | null; notes?: string | null }) =>
      plansApi.markPlanItem(v.itemId, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

// ---------------- Gamificação: Missões ----------------

export function useMissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.gamification.missions(user?.id),
    queryFn: gamificationApi.listMissions,
    enabled: !!user?.id,
    staleTime: 20_000,
  });
}

export function useClaimMission() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => gamificationApi.claimMission(missionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.gamification.missions(user?.id) });
      qc.invalidateQueries({ queryKey: ["gamification"] });
      qc.invalidateQueries({ queryKey: qk.xp.summary(user?.id) });
      qc.invalidateQueries({ queryKey: qk.profile.me(user?.id) });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---------------- Gamificação: Conquistas ----------------

export function useAchievements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.gamification.achievements(user?.id),
    queryFn: gamificationApi.listAchievements,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useClaimAchievement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gamificationApi.claimAchievement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.gamification.achievements(user?.id) });
      qc.invalidateQueries({ queryKey: qk.xp.summary(user?.id) });
      qc.invalidateQueries({ queryKey: qk.profile.me(user?.id) });
    },
  });
}

// ---------------- Gamificação: Histórico de Recompensas ----------------

export function useRewardHistory(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.gamification.rewardHistory(user?.id, limit),
    queryFn: () => gamificationApi.listRewardHistory(limit),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

// ---------------- XP / Progressão ----------------

export function useXpSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.xp.summary(user?.id),
    queryFn: xpApi.fetchXpSummary,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useXpProgress() {
  return useQuery({
    queryKey: qk.xp.progress(),
    queryFn: xpApi.fetchXpProgress,
    staleTime: 5 * 60_000,
  });
}

// ---------------- Rankings ----------------

export function useRankingTop(slug: string, limit = 100) {
  return useQuery({
    queryKey: qk.rankings.top(slug, limit),
    queryFn: () => rankingsApi.fetchRankingTop(slug, limit),
    enabled: !!slug,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useRankingNearby(slug: string, radius = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.rankings.nearby(slug, user?.id, radius),
    queryFn: () => rankingsApi.fetchRankingNearby(slug, radius),
    enabled: !!slug && !!user?.id,
    staleTime: 30_000,
  });
}

export function useRanking(slug: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.rankings.position(slug, user?.id),
    queryFn: () => rankingsApi.fetchRankingPosition(slug),
    enabled: !!slug && !!user?.id,
    staleTime: 30_000,
  });
}

export function useRankingHistory(slug: string, limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.rankings.history(slug, user?.id, limit),
    queryFn: () => rankingsApi.fetchRankingHistory(slug, limit),
    enabled: !!slug && !!user?.id,
    staleTime: 60_000,
  });
}

export function useLeagueStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.rankings.league(user?.id),
    queryFn: rankingsApi.fetchLeagueStatus,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useSeasonStatus() {
  return useQuery({
    queryKey: qk.rankings.season(),
    queryFn: rankingsApi.fetchSeasonStatus,
    staleTime: 5 * 60_000,
  });
}

// ---------------- Profile stats / history / friends ----------------

export function useProfileStats(userId?: string | null) {
  const { user } = useAuth();
  const id = userId ?? user?.id ?? null;
  return useQuery({
    queryKey: qk.profile.stats(id),
    queryFn: () => profileApi.getProfileStats(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useProfileHistory(userId?: string | null) {
  const { user } = useAuth();
  const id = userId ?? user?.id ?? null;
  return useQuery({
    queryKey: qk.profile.history(id),
    queryFn: () => profileApi.getProfileHistory(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useProfileFriends(userId?: string | null) {
  const { user } = useAuth();
  const id = userId ?? user?.id ?? null;
  return useQuery({
    queryKey: qk.profile.friends(id),
    queryFn: () => profileApi.getFriends(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useUsernameAvailable(username: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.profile.usernameCheck(username),
    queryFn: () => profileApi.checkUsernameAvailable(username),
    enabled: enabled && !!username && username.length >= 3,
    staleTime: 30_000,
  });
}

// ---------------- Friends ----------------

function invalidateFriends(qc: ReturnType<typeof useQueryClient>, meuId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: qk.friends.pending(meuId) });
  qc.invalidateQueries({ queryKey: qk.friends.list(meuId) });
  qc.invalidateQueries({ queryKey: qk.friends.blocked(meuId) });
  qc.invalidateQueries({ queryKey: ["friends", "relation", meuId ?? "anon"] });
}

export function useRelacao(meuId: string | null | undefined, outroId: string | null | undefined) {
  return useQuery({
    queryKey: qk.friends.relation(meuId, outroId),
    queryFn: () => friendsApi.getRelacao(meuId!, outroId!),
    enabled: !!meuId && !!outroId,
    staleTime: 15_000,
  });
}

export function usePedidosPendentes(meuId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.friends.pending(meuId),
    queryFn: () => friendsApi.listPedidosPendentes(meuId!),
    enabled: !!meuId,
    staleTime: 15_000,
  });
  useEffect(() => {
    if (!meuId) return;
    return friendsApi.subscribePedidosPendentes(meuId, () => {
      qc.invalidateQueries({ queryKey: qk.friends.pending(meuId) });
      qc.invalidateQueries({ queryKey: qk.friends.list(meuId) });
    });
  }, [meuId, qc]);
  return query;
}

export function useAmigos(meuId: string | null | undefined) {
  return useQuery({
    queryKey: qk.friends.list(meuId),
    queryFn: () => friendsApi.listAmigos(meuId!),
    enabled: !!meuId,
    staleTime: 30_000,
  });
}

export function useBloqueados(meuId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.friends.blocked(meuId),
    queryFn: () => friendsApi.listBloqueados(meuId!),
    enabled: enabled && !!meuId,
    staleTime: 30_000,
  });
}

export function useSearchProfiles(q: string, enabled = true) {
  return useQuery({
    queryKey: qk.friends.search(q),
    queryFn: () => friendsApi.searchProfiles(q),
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useEnviarPedido() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outroId: string) => friendsApi.enviarPedido(user!.id, outroId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

export function useAceitarPedido() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amizadeId: string) => friendsApi.aceitarPedido(amizadeId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

export function useRecusarPedido() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amizadeId: string) => friendsApi.recusarPedido(amizadeId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

export function useRemoverAmizade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outroId: string) => friendsApi.removerAmizade(user!.id, outroId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

export function useBloquearUsuario() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outroId: string) => friendsApi.bloquear(user!.id, outroId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

export function useDesbloquearUsuario() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outroId: string) => friendsApi.desbloquear(user!.id, outroId),
    onSuccess: () => invalidateFriends(qc, user?.id),
  });
}

// ---------------- Notifications ----------------

export function useAdminAlerts(enabled: boolean) {
  return useQuery({
    queryKey: qk.notifications.adminAlerts(),
    queryFn: notificationsApi.fetchAdminAlerts,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  });
}

// ---------------- Arena ----------------


export function useArena() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.arena.salas(),
    queryFn: arenaApi.listSalasEParticipantes,
    staleTime: 5_000,
  });
  useEffect(() => {
    return arenaApi.subscribeSalasGlobal(() => {
      qc.invalidateQueries({ queryKey: qk.arena.salas() });
    });
  }, [qc]);
  return query;
}

export function useArenaSala(salaId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.arena.sala(salaId ?? ""),
    queryFn: () => arenaApi.getSala(salaId!),
    enabled: !!salaId,
    staleTime: 2_000,
  });
  useEffect(() => {
    if (!salaId) return;
    return arenaApi.subscribeSala(salaId, () => {
      qc.invalidateQueries({ queryKey: qk.arena.sala(salaId) });
    });
  }, [salaId, qc]);
  return query;
}

export function useArenaAdminSalas(pollMs = 3000) {
  return useQuery({
    queryKey: qk.arena.admin(),
    queryFn: arenaApi.listSalasAdmin,
    refetchInterval: pollMs,
    staleTime: 0,
  });
}

export function useArenaMensagens(salaId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.arena.mensagens(salaId ?? ""),
    queryFn: () => arenaApi.listMensagens(salaId!),
    enabled: !!salaId,
    staleTime: 5_000,
  });
  useEffect(() => {
    if (!salaId) return;
    return arenaApi.subscribeChat(salaId, (row) => {
      qc.setQueryData<arenaApi.ArenaMensagemDTO[]>(qk.arena.mensagens(salaId), (prev) => {
        const cur = prev ?? [];
        if (cur.some((m) => m.id === row.id)) return cur;
        return [...cur, row];
      });
    });
  }, [salaId, qc]);
  return query;
}

export function useArenaQuestoes(
  salaId: string | null | undefined,
  startedAt: string | null | undefined,
) {
  const qc = useQueryClient();
  const enabled = !!salaId && !!startedAt;
  const query = useQuery({
    queryKey: qk.arena.questoes(salaId ?? "", startedAt),
    queryFn: () => arenaApi.loadQuestoesSessao(salaId!, startedAt!),
    enabled,
    staleTime: 30_000,
  });
  useEffect(() => {
    if (!enabled || !salaId || !startedAt) return;
    return arenaApi.subscribeQuestoesSessao(salaId, (row) => {
      if (Math.abs(new Date(row.sessao_started_at).getTime() - new Date(startedAt).getTime()) > 1000) return;
      qc.setQueryData<arenaApi.ArenaQuestaoSessaoDTO[]>(
        qk.arena.questoes(salaId, startedAt),
        (prev) => {
          const cur = prev ?? [];
          if (cur.some((q) => q.id === row.id)) return cur;
          return [...cur, row].sort((a, b) => a.ordem - b.ordem);
        },
      );
    });
  }, [enabled, salaId, startedAt, qc]);
  return query;
}

export function useArenaRespostas(
  salaId: string | null | undefined,
  startedAt: string | null | undefined,
) {
  const qc = useQueryClient();
  const enabled = !!salaId && !!startedAt;
  const query = useQuery({
    queryKey: qk.arena.respostas(salaId ?? "", startedAt),
    queryFn: () => arenaApi.listRespostasSessao(salaId!, startedAt!),
    enabled,
    staleTime: 1_000,
  });
  useEffect(() => {
    if (!enabled || !salaId || !startedAt) return;
    return arenaApi.subscribeRespostasSessao(salaId, (row) => {
      if (Math.abs(new Date(row.sessao_started_at).getTime() - new Date(startedAt).getTime()) > 1000) return;
      qc.setQueryData<arenaApi.ArenaRespostaDTO[]>(
        qk.arena.respostas(salaId, startedAt),
        (prev) => {
          const cur = prev ?? [];
          if (cur.some((r) => r.ordem === row.ordem && r.user_id === row.user_id)) return cur;
          return [...cur, row];
        },
      );
    });
  }, [enabled, salaId, startedAt, qc]);
  return query;
}

export function useArenaResultados(
  salaId: string | null | undefined,
  startedAt: string | null | undefined,
) {
  return useQuery({
    queryKey: qk.arena.resultados(salaId ?? "", startedAt),
    queryFn: () => arenaApi.listRespostasResultados(salaId!, startedAt!),
    enabled: !!salaId && !!startedAt,
    staleTime: 30_000,
  });
}

export function useArenaEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (salaId: string) => arenaApi.entrarSala(salaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.arena.salas() }),
  });
}

export function useArenaSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (salaId: string) => arenaApi.sairSala(salaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.arena.salas() }),
  });
}

export function useArenaTick() {
  return useMutation({
    mutationFn: (salaId: string) => arenaApi.tickSala(salaId),
  });
}

export function useArenaWalkover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (salaId: string) => arenaApi.garantirWalkover(salaId),
    onSuccess: (_d, salaId) => qc.invalidateQueries({ queryKey: qk.arena.sala(salaId) }),
  });
}

export function useArenaResponder() {
  return useMutation({
    mutationFn: (input: Parameters<typeof arenaApi.responder>[0]) => arenaApi.responder(input),
  });
}

export function useArenaEnviarMensagem() {
  return useMutation({
    mutationFn: (input: Parameters<typeof arenaApi.enviarMensagem>[0]) =>
      arenaApi.enviarMensagem(input),
  });
}

export function useArenaQuickMatch() {
  return useMutation({ mutationFn: () => arenaApi.quickMatch() });
}

/**
 * Progresso de XP do usuário na Arena, com detecção de level-up entre
 * atualizações. Reativo via Realtime em `arena_xp_historico`.
 */
export function useArenaProgresso(userId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.arena.progresso(userId),
    queryFn: () => arenaApi.fetchProgressoNivel(userId!),
    enabled: !!userId,
    staleTime: 15_000,
  });
  useEffect(() => {
    if (!userId) return;
    return arenaApi.subscribeArenaXp(userId, () => {
      qc.invalidateQueries({ queryKey: qk.arena.progresso(userId) });
    });
  }, [userId, qc]);
  return query;
}

// ---------------- Simulações ----------------

export function useSimulacoesHistorico(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.simulations.historico(user?.id, limit),
    queryFn: () => simulationsApi.listHistorico(limit),
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}

export function useSimulacaoEstado(simId: string | undefined) {
  return useQuery({
    queryKey: qk.simulations.estado(simId ?? ""),
    queryFn: () => simulationsApi.getEstado(simId!),
    enabled: !!simId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSimulacaoRelatorio(simId: string | undefined) {
  return useQuery({
    queryKey: qk.simulations.relatorio(simId ?? ""),
    queryFn: () => simulationsApi.getRelatorio(simId!),
    enabled: !!simId,
    staleTime: 60_000,
  });
}

export function useSimulacaoMaterias() {
  return useQuery({
    queryKey: qk.simulations.materias(),
    queryFn: () => simulationsApi.listMaterias(),
    staleTime: 5 * 60_000,
  });
}

export function useSimulacaoBancas() {
  return useQuery({
    queryKey: qk.simulations.bancas(),
    queryFn: () => simulationsApi.listBancas(),
    staleTime: 5 * 60_000,
  });
}

export function useCriarSimulacao() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: simulationsApi.CreateSimulationInput) =>
      simulationsApi.criarSimulado(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulations", "historico", user?.id ?? "anon"] });
    },
  });
}

export function useResponderSimulacao(simId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      ordem: number;
      resposta: simulationsApi.SimulationAnswerValue;
      tempoSegundos: number;
    }) => simulationsApi.responder(simId!, v.ordem, v.resposta, v.tempoSegundos),
    onSuccess: () => {
      if (simId) qc.invalidateQueries({ queryKey: qk.simulations.estado(simId) });
    },
  });
}

export function useMarcarRevisaoSimulacao(simId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ordem: number; marcada: boolean }) =>
      simulationsApi.marcarRevisao(simId!, v.ordem, v.marcada),
    onSuccess: () => {
      if (simId) qc.invalidateQueries({ queryKey: qk.simulations.estado(simId) });
    },
  });
}

export function useAutosaveSimulacao(simId: string | undefined) {
  return useMutation({
    mutationFn: (v: { questaoAtual: number; tempoRestante: number }) =>
      simulationsApi.autosave(simId!, v.questaoAtual, v.tempoRestante),
  });
}

export function useFinalizarSimulacao(simId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => simulationsApi.finalizar(simId!),
    onSuccess: () => {
      if (simId) {
        qc.invalidateQueries({ queryKey: qk.simulations.estado(simId) });
        qc.invalidateQueries({ queryKey: qk.simulations.relatorio(simId) });
      }
      qc.invalidateQueries({ queryKey: ["simulations", "historico", user?.id ?? "anon"] });
    },
  });
}

export function useCancelarSimulacao(simId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => simulationsApi.cancelar(simId!),
    onSuccess: () => {
      if (simId) qc.invalidateQueries({ queryKey: qk.simulations.estado(simId) });
      qc.invalidateQueries({ queryKey: ["simulations", "historico", user?.id ?? "anon"] });
    },
  });
}



// ---------------- Ciclo de Estudos ----------------

export function useStudyCycle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.studyCycle.all(user?.id) });

  const query = useQuery({
    queryKey: qk.studyCycle.all(user?.id),
    queryFn: () => studyCycleApi.loadAllForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const state = query.data ?? { cycles: [], disciplines: {}, progress: {}, sessions: {} };
  const stats = useMemo(() => studyCycleApi.computeStatsFor(state), [state]);

  const withToast = async <T,>(fn: () => Promise<T>, successMsg?: string): Promise<T | null> => {
    try {
      const result = await fn();
      if (successMsg) toast.success(successMsg);
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      return null;
    } finally {
      invalidate();
    }
  };

  return {
    user,
    loading: query.isLoading,
    cycles: state.cycles,
    disciplines: state.disciplines,
    progress: state.progress,
    sessions: state.sessions,
    stats,
    createCycle: (input: studyCycleApi.StudyCyclePayload) =>
      user ? withToast(() => studyCycleApi.createCycle(user.id, input), "Ciclo criado") : Promise.resolve(null),
    updateCycle: async (id: string, input: studyCycleApi.StudyCyclePayload) => {
      if (!user) return null;
      const existing = state.disciplines[id] ?? [];
      const prog = state.progress[id];
      const ok = await withToast(
        () => studyCycleApi.updateCycle(user.id, id, input, existing, prog).then(() => true),
        "Ciclo atualizado",
      );
      return ok;
    },
    duplicateCycle: async (id: string) => {
      if (!user) return null;
      const source = state.cycles.find((c) => c.id === id);
      const src = state.disciplines[id] ?? [];
      if (!source || src.length === 0) {
        toast.error("Ciclo não encontrado");
        return null;
      }
      return withToast(() => studyCycleApi.duplicateCycle(user.id, source, src), "Ciclo duplicado");
    },
    removeCycle: (id: string) =>
      user ? withToast(() => studyCycleApi.removeCycle(user.id, id), "Ciclo excluído") : Promise.resolve(null),
    setDefault: (id: string) =>
      user ? withToast(() => studyCycleApi.setDefaultCycle(user.id, id)) : Promise.resolve(null),
    ensureProgress: (id: string) => withToast(() => studyCycleApi.ensureProgress(id)),
    startSession: (cycleId: string, cycleDisciplineId?: string | null) =>
      withToast(() => studyCycleApi.startSession(cycleId, cycleDisciplineId)),
    advance: (cycleId: string) => withToast(() => studyCycleApi.advanceCycle(cycleId)),
    registerSession: (input: studyCycleApi.StudyCycleSessionInput) =>
      withToast(() => studyCycleApi.registerSession(input)),
    reload: () => query.refetch(),
  };
}

// ---------------- Editais ----------------

export function useEditais() {
  const query = useQuery({
    queryKey: qk.exams.listActive(),
    queryFn: () => examsApi.listActiveExams(),
    staleTime: 60_000,
  });
  return { editais: query.data ?? [], loading: query.isLoading, reload: query.refetch };
}

export function useEditaisAdmin() {
  const query = useQuery({
    queryKey: qk.exams.listAll(),
    queryFn: () => examsApi.listAllExams(),
    staleTime: 15_000,
  });
  return { editais: query.data ?? [], loading: query.isLoading, reload: query.refetch };
}

export function useMeuEdital() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.exams.my(user?.id),
    queryFn: () => examsApi.getMyExams(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const state = query.data ?? { principalId: null, favoritos: [] as string[] };
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.exams.my(user?.id) });

  const selecionar = async (id: string) => {
    try {
      await examsApi.selectMainExam(id);
      toast.success("Edital principal atualizado");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };
  const favoritar = async (id: string, fav: boolean) => {
    try {
      await examsApi.favoriteExam(id, fav);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };
  return {
    principalId: state.principalId,
    favoritos: state.favoritos,
    loading: query.isLoading,
    selecionar,
    favoritar,
    reload: query.refetch,
  };
}

export function useEditalProgresso(editalId?: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.exams.progress(editalId),
    queryFn: () => examsApi.getExamProgress(editalId),
    staleTime: 30_000,
  });
  const setStatusDisciplina = async (disciplinaId: string, status: string) => {
    try {
      await examsApi.setDisciplineStatus(disciplinaId, status);
      qc.invalidateQueries({ queryKey: qk.exams.progress(editalId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    reload: query.refetch,
    setStatusDisciplina,
  };
}

export function useMetaHoje(minutos = 60) {
  const query = useQuery({
    queryKey: qk.exams.dailyGoal(minutos),
    queryFn: () => examsApi.getDailyGoal(minutos),
    staleTime: 60_000,
  });
  return { meta: query.data ?? { itens: [] }, loading: query.isLoading };
}

export function useExamDisciplines(editalId: string) {
  const query = useQuery({
    queryKey: qk.exams.disciplines(editalId),
    queryFn: () => examsApi.listExamDisciplines(editalId),
    enabled: !!editalId,
    staleTime: 30_000,
  });
  return { list: query.data ?? [], loading: query.isLoading, reload: query.refetch };
}

// ---------------- Stats / Performance / Recommendations / Explanations (Fase 14E) ----------------

import * as statsApi from "./stats";
import * as performanceApi from "./performance";
import * as recommendationsApi from "./recommendations";
import * as explanationsApi from "./explanations";
import type { RecoPlano, RecoConfig } from "./recommendations";
import type { ExplicacaoAtiva } from "./explanations";

export function useStatsDashboard() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.stats.dashboard(user?.id),
    queryFn: () => statsApi.fetchDashboard(),
    staleTime: 20_000,
  });
  return { data: q.data ?? null, loading: q.isLoading, refetch: q.refetch };
}

export function useStatsEvolucao(dias: number) {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.stats.evolucao(user?.id, dias),
    queryFn: () => statsApi.fetchEvolucao(dias),
    staleTime: 20_000,
  });
  return { rows: q.data ?? [], loading: q.isLoading };
}

export function useStatsDisciplinas() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.stats.disciplinas(user?.id),
    queryFn: () => statsApi.fetchDisciplinas(),
    staleTime: 20_000,
  });
  return { rows: q.data ?? [], loading: q.isLoading };
}

export function useStatsHeatmap() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.stats.heatmap(user?.id),
    queryFn: () => statsApi.fetchHeatmap(),
    staleTime: 20_000,
  });
  return { rows: q.data ?? [], loading: q.isLoading };
}

export function useStatsRecomendacoes() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.stats.recomendacoes(user?.id),
    queryFn: () => statsApi.fetchRecomendacoes(),
    staleTime: 20_000,
  });
  return { data: q.data ?? null, loading: q.isLoading };
}

export function useDesempenho() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.performance.resumo(user?.id),
    enabled: !!user,
    staleTime: 20_000,
    queryFn: () => performanceApi.fetchDesempenhoResumo(),
  });
}

export function usePlanoHoje() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = qk.recommendations.planoHoje(user?.id);
  const q = useQuery({
    queryKey: key,
    queryFn: () => recommendationsApi.fetchPlanoHoje(false),
    staleTime: 30_000,
  });
  const recarregar = async () => {
    const fresh = await recommendationsApi.fetchPlanoHoje(true);
    qc.setQueryData(key, fresh);
  };
  const marcar = async (itemId: string, concluido: boolean) => {
    const updated = await recommendationsApi.marcarItem(itemId, concluido);
    if (updated) qc.setQueryData<RecoPlano | null>(key, updated);
  };
  return { plano: q.data ?? null, loading: q.isLoading, recarregar, marcar };
}

export function useRecoConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = qk.recommendations.config(user?.id);
  const q = useQuery({
    queryKey: key,
    queryFn: () => recommendationsApi.fetchConfig(),
    staleTime: 60_000,
  });
  const salvar = async (c: Partial<RecoConfig>) => {
    const updated = await recommendationsApi.salvarConfig(c);
    if (updated) qc.setQueryData<RecoConfig | null>(key, updated);
  };
  const recarregar = async () => { await q.refetch(); };
  return { config: q.data ?? null, loading: q.isLoading, salvar, recarregar };
}

export function useExplicacao(questaoId: string | null | undefined) {
  const qc = useQueryClient();
  const key = qk.explanations.ativa(questaoId);
  const q = useQuery({
    queryKey: key,
    enabled: !!questaoId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!questaoId) return null;
      const atual = await explanationsApi.fetchExplicacaoAtiva(questaoId);
      if (atual) {
        explanationsApi.registrarVisualizacao(atual.id);
        return atual;
      }
      // gera se ausente
      await explanationsApi.gerarNovaExplicacao(questaoId, false);
      return await explanationsApi.fetchExplicacaoAtiva(questaoId);
    },
  });

  const gerarMut = useMutation({
    mutationFn: async (forcar: boolean) => {
      if (!questaoId) return null;
      await explanationsApi.gerarNovaExplicacao(questaoId, forcar);
      return await explanationsApi.fetchExplicacaoAtiva(questaoId);
    },
    onSuccess: (data) => { if (data) qc.setQueryData(key, data); },
  });

  const avaliar = async (util: boolean, motivo?: string) => {
    const explicacao = q.data;
    if (!explicacao) return;
    const res = await explanationsApi.registrarFeedback(explicacao.id, util, motivo ?? null, false);
    const next: ExplicacaoAtiva = {
      ...explicacao,
      curtidas: res?.curtidas ?? explicacao.curtidas,
      descurtidas: res?.descurtidas ?? explicacao.descurtidas,
      meu_feedback: { util, denuncia: false },
    };
    qc.setQueryData(key, next);
  };

  const denunciar = async (motivo: string) => {
    const explicacao = q.data;
    if (!explicacao) return;
    await explanationsApi.registrarFeedback(explicacao.id, false, motivo, true);
  };

  return {
    explicacao: q.data ?? null,
    carregando: q.isLoading,
    gerando: gerarMut.isPending,
    erro: q.error ? (q.error instanceof Error ? q.error.message : "Erro ao carregar explicação") : null,
    recarregar: () => q.refetch(),
    regenerar: () => gerarMut.mutateAsync(true),
    avaliar,
    denunciar,
  };
}

// ---------------- History / Calendar / Timer / Settings (Fase 14F) ----------------

import * as historyApi from "./history";
import * as calendarApi from "./calendar";
import * as timerApi from "./timer";
import * as settingsApi from "./settings";
import type { SessaoEstudo, NovaSessaoEstudo } from "./history";
import type { EventoAgenda, NovoEventoAgenda } from "./calendar";

export function useHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = qk.history.list(user?.id);
  const q = useQuery({
    queryKey: key,
    enabled: !!user,
    staleTime: 20_000,
    queryFn: () => historyApi.listSessoes(user!.id, false),
  });

  const insert = async (payload: NovaSessaoEstudo): Promise<SessaoEstudo | null> => {
    if (!user) return null;
    try {
      const row = await historyApi.insertSessao(user.id, payload);
      qc.setQueryData<SessaoEstudo[]>(key, (prev) => [row, ...(prev ?? [])]);
      qc.invalidateQueries({ queryKey: qk.timer.sessoes(user.id) });
      return row;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar registro");
      return null;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await historyApi.deleteSessao(id);
      qc.setQueryData<SessaoEstudo[]>(key, (prev) => (prev ?? []).filter((r) => r.id !== id));
      if (user) qc.invalidateQueries({ queryKey: qk.timer.sessoes(user.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return { rows: q.data ?? [], loading: q.isLoading, insert, remove, reload: q.refetch };
}

export function useTimerSessions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = qk.timer.sessoes(user?.id);
  const q = useQuery({
    queryKey: key,
    enabled: !!user,
    staleTime: 20_000,
    queryFn: () => timerApi.listTimerSessoes(user!.id, false),
  });

  const insert = async (payload: NovaSessaoEstudo): Promise<SessaoEstudo | null> => {
    if (!user) return null;
    try {
      const row = await timerApi.finishTimerSessao(user.id, payload);
      qc.setQueryData<SessaoEstudo[]>(key, (prev) => [row, ...(prev ?? [])]);
      qc.invalidateQueries({ queryKey: qk.history.list(user.id) });
      return row;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao encerrar sessão");
      return null;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await timerApi.deleteTimerSessao(id);
      qc.setQueryData<SessaoEstudo[]>(key, (prev) => (prev ?? []).filter((r) => r.id !== id));
      if (user) qc.invalidateQueries({ queryKey: qk.history.list(user.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return { rows: q.data ?? [], loading: q.isLoading, insert, remove, reload: q.refetch };
}

export function useCalendar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = qk.calendar.list(user?.id);
  const q = useQuery({
    queryKey: key,
    enabled: !!user,
    staleTime: 20_000,
    queryFn: () => calendarApi.listEventos(user!.id),
  });

  const insert = async (payload: NovoEventoAgenda): Promise<EventoAgenda | null> => {
    if (!user) return null;
    try {
      const row = await calendarApi.insertEvento(user.id, payload);
      qc.setQueryData<EventoAgenda[]>(key, (prev) => [...(prev ?? []), row].sort((a, b) => a.data.localeCompare(b.data)));
      return row;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar evento");
      return null;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await calendarApi.deleteEvento(id);
      qc.setQueryData<EventoAgenda[]>(key, (prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return { rows: q.data ?? [], loading: q.isLoading, insert, remove, reload: q.refetch };
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (novaSenha: string) => settingsApi.updatePassword(novaSenha),
  });
}

export function usePurgeAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => settingsApi.purgeUserData(userId),
    onSuccess: () => { qc.clear(); },
  });
}

// ---------------- Study Intelligence (Fase 21A/21B) ----------------

import * as aiApi from "./ai";

const AI_QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: 1,
} as const;

export function useStudyInsights() {
  const { user } = useAuth();
  return useQuery<aiApi.StudyInsightDTO[], Error>({
    queryKey: qk.ai.insights(user?.id),
    queryFn: () => aiApi.fetchStudyInsights(),
    enabled: !!user?.id,
    ...AI_QUERY_DEFAULTS,
  });
}

export function useStudyDiagnosis() {
  const { user } = useAuth();
  return useQuery<aiApi.StudyDiagnosisDTO | null, Error>({
    queryKey: qk.ai.diagnosis(user?.id),
    queryFn: () => aiApi.fetchStudyDiagnosis(),
    enabled: !!user?.id,
    ...AI_QUERY_DEFAULTS,
  });
}

export function useStudyPriorities() {
  const { user } = useAuth();
  return useQuery<aiApi.StudyPriorityDTO[], Error>({
    queryKey: qk.ai.priorities(user?.id),
    queryFn: () => aiApi.fetchStudyPriorities(),
    enabled: !!user?.id,
    ...AI_QUERY_DEFAULTS,
  });
}

export function useStudyRecommendations() {
  const { user } = useAuth();
  return useQuery<aiApi.StudyRecommendationDTO[], Error>({
    queryKey: qk.ai.recommendations(user?.id),
    queryFn: () => aiApi.fetchStudyRecommendations(),
    enabled: !!user?.id,
    ...AI_QUERY_DEFAULTS,
  });
}


// ---------------- Question Engine (Fase 22B) ----------------

import * as qeApi from "./questionEngine";

const QE_QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: 1,
} as const;

/** Hook genérico: expõe todos os fetchers do engine para uso ad-hoc. */
export function useQuestionEngine() {
  return qeApi;
}

export function useRandomQuestions(filters: qeApi.RandomFilters = {}, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.random(user?.id, filters as Record<string, unknown>),
    queryFn: () => qeApi.fetchRandomQuestions(filters),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

export function useBySubjectQuestions(filters: qeApi.BySubjectFilters, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.bySubject(user?.id, filters as unknown as Record<string, unknown>),
    queryFn: () => qeApi.fetchBySubjectQuestions(filters),
    enabled: !!user?.id && !!filters.disciplineId && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

export function useReviewQuestions(limit = 20, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.review(user?.id, limit),
    queryFn: () => qeApi.fetchReviewQuestions({ limit }),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

export function useDailyQuestions(filters: qeApi.DailyFilters = {}, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.daily(user?.id, filters as Record<string, unknown>),
    queryFn: () => qeApi.fetchDailyQuestions(filters),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

export function useSimulationQuestions(filters: qeApi.SimulationFilters = {}, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.simulation(user?.id, filters as Record<string, unknown>),
    queryFn: () => qeApi.fetchSimulationQuestions(filters),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

export function useAdaptiveQuestions(filters: qeApi.AdaptiveFilters = {}, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<qeApi.EngineQuestionDTO[], Error>({
    queryKey: qk.questionEngine.adaptive(user?.id, filters as Record<string, unknown>),
    queryFn: () => qeApi.fetchAdaptiveQuestions(filters),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...QE_QUERY_DEFAULTS,
  });
}

// ---------------- Reviews (SRS Fase 22C) ----------------

import * as reviewsApi from "./reviews";

const REVIEWS_QUERY_DEFAULTS = {
  staleTime: 30_000,
  retry: 1,
} as const;

export function useReviewSchedule(filters: reviewsApi.ScheduleFilters = {}, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<reviewsApi.ReviewScheduleItemDTO[], Error>({
    queryKey: qk.reviews.schedule(user?.id, filters as Record<string, unknown>),
    queryFn: () => reviewsApi.fetchReviewSchedule(filters),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...REVIEWS_QUERY_DEFAULTS,
  });
}

export function useReviewToday(limit = 100, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<reviewsApi.ReviewDueItemDTO[], Error>({
    queryKey: qk.reviews.dueToday(user?.id, limit),
    queryFn: () => reviewsApi.fetchReviewsDueToday({ limit }),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...REVIEWS_QUERY_DEFAULTS,
  });
}

export function useReviewStats(opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<reviewsApi.ReviewStatisticsDTO, Error>({
    queryKey: qk.reviews.statistics(user?.id),
    queryFn: () => reviewsApi.fetchReviewStatistics(),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...REVIEWS_QUERY_DEFAULTS,
  });
}

export function useRegisterReview() {
  const qc = useQueryClient();
  return useMutation<reviewsApi.RegisterReviewResultDTO, Error, { questionId: string; isCorrect: boolean }>({
    mutationFn: ({ questionId, isCorrect }) => reviewsApi.registerReviewAnswer(questionId, isCorrect),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    retry: 1,
  });
}

export function useResetReview() {
  const qc = useQueryClient();
  return useMutation<boolean, Error, { questionId: string }>({
    mutationFn: ({ questionId }) => reviewsApi.resetReviewQuestion(questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    retry: 1,
  });
}


// ---------------- Missions (Fase 22D) ----------------

import * as missionsApi from "./missions";

const MISSIONS_QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: 1,
} as const;

export function useDailyMissions(opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<missionsApi.MissionDTO[], Error>({
    queryKey: qk.missions.daily(user?.id),
    queryFn: () => missionsApi.fetchDailyMissions(),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...MISSIONS_QUERY_DEFAULTS,
  });
}

export function useWeeklyMissions(opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<missionsApi.MissionDTO[], Error>({
    queryKey: qk.missions.weekly(user?.id),
    queryFn: () => missionsApi.fetchWeeklyMissions(),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...MISSIONS_QUERY_DEFAULTS,
  });
}

export function useGenerateMissions() {
  const qc = useQueryClient();
  return useMutation<missionsApi.MissionDTO[], Error, { force?: boolean } | void>({
    mutationFn: (input) => missionsApi.generateMissions(input?.force ?? false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
    },
    retry: 1,
  });
}

export function useMissionProgress() {
  const qc = useQueryClient();
  return useMutation<missionsApi.MissionProgressDTO | null, Error, { missionId: string; delta?: number }>({
    mutationFn: ({ missionId, delta }) => missionsApi.updateMissionProgress(missionId, delta ?? 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
    },
    retry: 1,
  });
}

export function useMissionClaim() {
  const qc = useQueryClient();
  return useMutation<missionsApi.MissionClaimDTO, Error, { missionId: string }>({
    mutationFn: ({ missionId }) => missionsApi.claimMission(missionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
      qc.invalidateQueries({ queryKey: ["gamification"] });
    },
    retry: 1,
  });
}

export function useMissionStatistics(opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery<missionsApi.MissionStatisticsDTO, Error>({
    queryKey: qk.missions.statistics(user?.id),
    queryFn: () => missionsApi.fetchMissionStatistics(),
    enabled: !!user?.id && (opts?.enabled ?? true),
    ...MISSIONS_QUERY_DEFAULTS,
  });
}
