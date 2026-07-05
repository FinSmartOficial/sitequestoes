import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, type ElementType } from "react";
import {
  Swords, BookOpen, ClipboardList, RotateCcw, Notebook, Trophy,
  Flame, Target, Clock, TrendingUp, Zap, Award, Sparkles, ArrowRight,
  ChevronRight, Crown, CheckCircle2, Gift, RefreshCcw,
} from "lucide-react";

import {
  useMyProfile,
  useDashboardSummary,
  useProfileStats,
  useProfileHistory,
  useMissions,
  useReviewQueue,
  useRankingTop,
  useRanking,
  useXpSummary,
} from "@/api/hooks";
import { useEditais, useMeuEdital, useEditalProgresso, useStudyCycle } from "@/api";
import { PlanoInteligente } from "@/components/recomendacoes/PlanoInteligente";
import { AssistenteInteligente } from "@/components/ai/AssistenteInteligente";
import { XpProgressCard } from "@/components/xp/XpProgressCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Início — FinSmart Tec" },
      { name: "description", content: "Sua central de estudos inteligente: plano do dia, arena, missões, revisões e progresso do edital." },
    ],
  }),
  component: HomePage,
});

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const LIGA_TOM: Record<string, string> = {
  Bronze: "from-amber-700/40 to-amber-500/10 text-amber-300 ring-amber-500/30",
  Prata: "from-slate-400/30 to-slate-300/5 text-slate-200 ring-slate-300/30",
  Ouro: "from-amber-400/30 to-yellow-300/5 text-amber-300 ring-amber-300/30",
  Platina: "from-cyan-400/30 to-teal-300/5 text-cyan-200 ring-cyan-300/30",
  Diamante: "from-sky-400/30 to-indigo-400/10 text-sky-200 ring-sky-300/30",
  Mestre: "from-violet-500/30 to-fuchsia-400/10 text-violet-200 ring-violet-300/30",
  Lenda: "from-rose-500/30 to-orange-400/10 text-rose-200 ring-rose-300/30",
};

function HomePage() {
  const profileQ = useMyProfile();
  const profile = profileQ.data;
  const loadingProfile = profileQ.isLoading;

  const summaryQ = useDashboardSummary();
  const summary = summaryQ.data;
  const loadingSummary = summaryQ.isLoading;

  const statsQ = useProfileStats();
  const stats = statsQ.data;

  const xpQ = useXpSummary();
  const xp = xpQ.data;

  const missionsQ = useMissions();
  const missoesDiarias = (missionsQ.data ?? []).filter((m) => m.periodo === "diaria").slice(0, 3);
  const missoesConcluidas = missoesDiarias.filter((m) => m.concluida || m.resgatada).length;

  const revQueueQ = useReviewQueue(80);
  const rev = revQueueQ.data
    ? {
        pendentes: revQueueQ.data.total,
        vencidas: revQueueQ.data.items.filter((i) => i.overdue_days > 0).length,
      }
    : null;

  const topQ = useRankingTop("global_xp", 3);
  const topRanking = topQ.data ?? [];
  const meQ = useRanking("global_xp");
  const meRanking = meQ.data;

  const historyQ = useProfileHistory();
  const sessoes = historyQ.data?.estudos ?? [];

  // ─── Ciclo / Edital (pendência: hooks legados até turno próprio) ───
  const { editais } = useEditais();
  const { principalId } = useMeuEdital();
  const { data: progressoEdital } = useEditalProgresso(principalId);
  const {
    loading: loadingCycles,
    cycles: studyCycles,
    disciplines: studyCycleDisciplines,
    progress: studyCycleProgress,
    stats: studyCycleStats,
  } = useStudyCycle();

  const nome = profile?.nome?.split(" ")[0] ?? "estudante";
  const editalAtivo = useMemo(
    () => editais.find((e) => e.id === principalId) ?? null,
    [editais, principalId],
  );
  const diasProva = editalAtivo?.data_prova
    ? Math.max(0, Math.ceil((new Date(editalAtivo.data_prova).getTime() - Date.now()) / 86400000))
    : null;

  const cicloAtual = useMemo(
    () => studyCycles.find((cycle) => cycle.is_default) ?? studyCycles[0] ?? null,
    [studyCycles],
  );
  const disciplinasDoCiclo = useMemo(
    () => (cicloAtual ? (studyCycleDisciplines[cicloAtual.id] ?? []).filter((d) => d.enabled) : []),
    [cicloAtual, studyCycleDisciplines],
  );
  const progressoDoCiclo = cicloAtual ? studyCycleProgress[cicloAtual.id] : undefined;
  const posicaoDoCiclo = progressoDoCiclo?.current_position ?? cicloAtual?.current_position ?? 0;
  const disciplinaDoCiclo = disciplinasDoCiclo[posicaoDoCiclo] ?? disciplinasDoCiclo[0] ?? null;
  const percentualDoCiclo = disciplinasDoCiclo.length
    ? Math.round((posicaoDoCiclo / disciplinasDoCiclo.length) * 100)
    : 0;
  const statsDoCiclo = cicloAtual ? studyCycleStats[cicloAtual.id] : undefined;
  const hojeIso = new Date().toISOString().slice(0, 10);
  const minutosCicloHoje = statsDoCiclo?.weeklyHistory.find((row) => row.day === hojeIso)?.minutes ?? 0;

  const xpProgressoPct = Math.round((xp?.progresso ?? 0) * 100);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-card/60 to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-primary-glow/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary/80">
              <Sparkles className="h-3.5 w-3.5" />
              FinSmart Tec · Central Inteligente
            </div>
            {loadingProfile ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {saudacao()}, <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">{nome}</span>.
              </h1>
            )}
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Pronto para continuar sua preparação? Seu plano de estudo já está montado — só apertar play.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/arena">
              <Button size="lg" className="group h-11 gap-2 bg-gradient-to-r from-primary to-primary-glow font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:shadow-primary/40">
                <Swords className="h-4 w-4" /> Entrar na Arena
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/questoes" search={{}}>
              <Button size="lg" variant="outline" className="h-11 gap-2 border-border/60 bg-card/60 backdrop-blur">
                <BookOpen className="h-4 w-4" /> Praticar questões
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6">
          <PlanoInteligente compact />
        </div>
      </section>

      {/* Assistente Inteligente (Fase 21D) */}
      <AssistenteInteligente />

      {/* Progressão oficial */}
      <section aria-label="Progressão">
        <XpProgressCard />
      </section>

      {/* Stats bento */}
      <section aria-label="Estatísticas rápidas">
        <SectionHead icon={TrendingUp} title="Sua performance" hint="atualizado em tempo real" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard loading={xpQ.isLoading} icon={Zap} label="XP total" value={xp ? xp.xp_total.toLocaleString("pt-BR") : "—"} tone="text-amber-300" />
          <StatCard loading={xpQ.isLoading} icon={Crown} label="Liga" value={xp?.liga ?? profile?.liga ?? "—"} tone="text-violet-300" gradient={LIGA_TOM[xp?.liga ?? profile?.liga ?? ""]} />
          <StatCard loading={loadingSummary} icon={Target} label="Precisão" value={summary ? `${Math.round(summary.taxa_acerto * 100)}%` : "—"} tone="text-emerald-300" />
          <StatCard loading={loadingSummary} icon={BookOpen} label="Questões" value={summary ? summary.total_respondidas.toLocaleString("pt-BR") : "—"} tone="text-sky-300" />
          <StatCard loading={statsQ.isLoading} icon={Clock} label="Tempo estudado" value={stats ? fmtHoras(stats.minutos) : "—"} tone="text-cyan-300" />
          <StatCard loading={loadingSummary} icon={Flame} label="Sequência" value={summary ? `${summary.streak_dias}d` : "—"} tone="text-rose-300" />
        </div>

        {xp && (
          <div className="mt-4 rounded-2xl border border-border/50 bg-card/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Nível {xp.nivel}</span>
              <span className="text-muted-foreground">{xp.xp_atual} / {xp.xp_para_proximo_nivel} XP</span>
            </div>
            <Progress value={xpProgressoPct} className="h-2" />
          </div>
        )}
      </section>

      {/* Ciclo inteligente (pendência: migração dedicada) */}
      <section>
        <SectionHead icon={RefreshCcw} title="Ciclo de Estudos" hint="continua do ponto exato onde você parou" />
        <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-card/70 to-card/40 p-5">
          {loadingCycles ? (
            <Skeleton className="h-32 w-full" />
          ) : cicloAtual && disciplinaDoCiclo ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30">{cicloAtual.name}</Badge>
                  {cicloAtual.status === "paused" && <Badge variant="outline">Pausado</Badge>}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Próxima disciplina</p>
                  <h3 className="mt-1 text-2xl font-bold text-foreground">{disciplinaDoCiclo.discipline}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Meta de {disciplinaDoCiclo.study_minutes} min · {disciplinaDoCiclo.questions_goal} questões
                  </p>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Porcentagem concluída do ciclo atual</span>
                    <span className="font-semibold text-foreground">{percentualDoCiclo}%</span>
                  </div>
                  <Progress value={percentualDoCiclo} className="h-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                <MiniStat label="Hoje" value={`${minutosCicloHoje} min`} />
                <MiniStat label="Tempo total" value={`${statsDoCiclo?.studiedMinutes ?? 0} min`} />
                <MiniStat label="Questões" value={statsDoCiclo?.questionsAnswered ?? 0} />
                <MiniStat label="Giros" value={progressoDoCiclo?.completed_cycles ?? 0} />
                <Link to="/ciclo" className="col-span-2 sm:col-span-4">
                  <Button className="mt-1 w-full gap-2">
                    Continuar ciclo <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={RefreshCcw}
              title="Nenhum ciclo ativo"
              desc="Crie uma sequência contínua de disciplinas para estudar sem depender de calendário."
              cta={{ to: "/ciclo", label: "Criar ciclo" }}
            />
          )}
        </div>
      </section>

      {/* Atividades rápidas */}
      <section>
        <SectionHead icon={Zap} title="Atividades rápidas" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <QuickAction to="/arena" icon={Swords} label="Arena" desc="Multiplayer" tone="from-rose-500/20 to-orange-500/5" iconTone="text-rose-300" />
          <QuickAction to="/questoes" icon={BookOpen} label="Questões" desc="Banco completo" tone="from-sky-500/20 to-indigo-500/5" iconTone="text-sky-300" />
          <QuickAction to="/simulados" icon={ClipboardList} label="Simulados" desc="PMAL 2026" tone="from-violet-500/20 to-fuchsia-500/5" iconTone="text-violet-300" />
          <QuickAction to="/revisoes" icon={RotateCcw} label="Revisões" desc="Inteligentes" tone="from-emerald-500/20 to-teal-500/5" iconTone="text-emerald-300" />
          <QuickAction to="/cadernos" icon={Notebook} label="Cadernos" desc="Personalizados" tone="from-amber-500/20 to-yellow-500/5" iconTone="text-amber-300" />
          <QuickAction to="/missoes" icon={Trophy} label="Missões" desc="Diárias" tone="from-cyan-500/20 to-blue-500/5" iconTone="text-cyan-300" />
        </div>
      </section>

      {/* Bento inferior: Edital + Revisões */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-full rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Seu edital principal</h3>
                  <p className="text-xs text-muted-foreground">Progresso e prazo</p>
                </div>
              </div>
              <Link to="/editais" className="text-xs text-primary hover:underline">ver todos</Link>
            </div>

            {editalAtivo && progressoEdital ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-foreground">{editalAtivo.nome}</p>
                    <p className="text-xs text-muted-foreground">{editalAtivo.orgao ?? "—"} · {editalAtivo.banca ?? "—"}</p>
                  </div>
                  {diasProva !== null && (
                    <Badge variant={diasProva <= 30 ? "destructive" : "secondary"} className="shrink-0">
                      {diasProva} {diasProva === 1 ? "dia" : "dias"}
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso geral</span>
                    <span className="font-semibold text-foreground">{Math.round(progressoEdital.percentual)}%</span>
                  </div>
                  <Progress value={progressoEdital.percentual} className="h-2.5" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Disciplinas" value={progressoEdital.disciplinas.length} />
                  <MiniStat label="Concluídas" value={progressoEdital.resumo.concluidas ?? 0} />
                  <MiniStat label="Em andamento" value={progressoEdital.resumo.em_andamento ?? 0} />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum edital ativo"
                desc="Escolha um edital para acompanhar seu progresso por disciplina."
                cta={{ to: "/editais", label: "Escolher edital" }}
              />
            )}
          </div>
        </div>

        {/* Revisões */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revisões</h3>
                <p className="text-xs text-muted-foreground">Fila inteligente</p>
              </div>
            </div>
          </div>

          {rev ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <p className="text-2xl font-bold text-foreground">{rev.pendentes}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">pendentes</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <p className="text-2xl font-bold text-rose-300">{rev.vencidas}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">vencidas</p>
                </div>
              </div>
              <Link to="/revisoes">
                <Button className="w-full gap-2" variant={rev.pendentes > 0 ? "default" : "secondary"}>
                  Revisar agora <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </div>
      </section>

      {/* Missões + Ranking */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Missões diárias</h3>
                <p className="text-xs text-muted-foreground">{missoesConcluidas}/{missoesDiarias.length} concluídas</p>
              </div>
            </div>
            <Link to="/missoes" className="text-xs text-primary hover:underline">todas</Link>
          </div>
          <div className="space-y-3">
            {missoesDiarias.length === 0 ? (
              <EmptyState icon={Gift} title="Sem missões" desc="Novas missões aparecem todo dia." />
            ) : missoesDiarias.map((m) => {
              const pct = Math.min(100, (m.progresso / Math.max(1, m.objetivo)) * 100);
              const done = m.concluida || m.resgatada;
              return (
                <div key={m.id} className={cn("rounded-xl border p-3 transition", done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 bg-background/40")}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {m.titulo}
                    </p>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Zap className="h-3 w-3" /> {m.xp}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="mt-1 text-[11px] text-muted-foreground">{m.progresso} / {m.objetivo}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ranking global</h3>
                <p className="text-xs text-muted-foreground">XP total</p>
              </div>
            </div>
            <Link to="/rankings" className="text-xs text-primary hover:underline">completo</Link>
          </div>

          <div className="space-y-2">
            {topRanking.slice(0, 3).map((r, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={r.user_id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-2.5">
                  <span className="w-6 text-center text-lg">{medals[i]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.nome || r.username || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.liga ?? "—"} · Nv {r.nivel ?? 1}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{r.valor.toLocaleString("pt-BR")}</span>
                </div>
              );
            })}
            {meRanking && meRanking.posicao != null && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                <span className="w-6 text-center text-sm font-bold text-primary">#{meRanking.posicao}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">Você</p>
                  <p className="text-[11px] text-muted-foreground">Sua posição atual</p>
                </div>
                <span className="text-sm font-bold text-foreground">{meRanking.valor.toLocaleString("pt-BR")}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Histórico recente */}
      <section>
        <SectionHead icon={Clock} title="Atividade recente" />
        <div className="rounded-2xl border border-border/50 bg-card/60 p-2">
          {sessoes.length === 0 ? (
            <EmptyState icon={Clock} title="Sem atividades" desc="Comece a estudar para ver seu histórico aqui." cta={{ to: "/questoes", label: "Começar" }} />
          ) : (
            <ul className="divide-y divide-border/40">
              {sessoes.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.titulo || "Sessão de estudo"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(s.data).toLocaleDateString("pt-BR")} · {s.subtitulo}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- helpers visuais ---------- */

function fmtHoras(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function SectionHead({ icon: Icon, title, hint }: { icon: ElementType; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, gradient, loading,
}: { icon: ElementType; label: string; value: string; tone: string; gradient?: string; loading?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-4 transition-all",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      {gradient && <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40", gradient)} />}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-1 h-6 w-16" /> : (
            <p className={cn("mt-0.5 truncate text-xl font-bold", tone)}>{value}</p>
          )}
        </div>
        <Icon className={cn("h-4 w-4 shrink-0 opacity-60 transition group-hover:opacity-100", tone)} />
      </div>
    </motion.div>
  );
}

function QuickAction({
  to, icon: Icon, label, desc, tone, iconTone,
}: { to: string; icon: ElementType; label: string; desc: string; tone: string; iconTone: string }) {
  return (
    <Link to={to} className="group relative block">
      <motion.div
        whileHover={{ y: -3 }}
        className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
      >
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100", tone)} />
        <div className="relative">
          <div className={cn("mb-2 grid h-10 w-10 place-items-center rounded-xl bg-background/70 ring-1 ring-border/60", iconTone)}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon, title, desc, cta,
}: { icon: ElementType; title: string; desc: string; cta?: { to: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 p-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {cta && (
        <Link to={cta.to}>
          <Button size="sm" variant="outline">{cta.label}</Button>
        </Link>
      )}
    </div>
  );
}
