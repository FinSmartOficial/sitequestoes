import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Clock, Target, Trophy, TrendingUp, Flame, Zap, Download,
  FileText, FileSpreadsheet, FileDown, CheckCircle2, AlertTriangle, Loader2,
  BookOpen, Award, Crown, Percent,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useStatsDashboard, useStatsDisciplinas, useStatsEvolucao,
  useStatsHeatmap, useStatsRecomendacoes,
} from "@/api";
import { StatsHeatmap } from "@/components/stats/StatsHeatmap";
import { exportCSV, exportExcel, exportPDF } from "@/lib/statsExport";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas — FinSmart Tec" }] }),
  component: EstatisticasPage,
});

const RANGES = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "12 meses", value: 365 },
  { label: "Todo período", value: 1825 },
];

function EstatisticasPage() {
  const [range, setRange] = useState(30);
  const { data: dash, loading: loadingDash } = useStatsDashboard();
  const { rows: evolucao, loading: loadingEv } = useStatsEvolucao(range);
  const { rows: disciplinas, loading: loadingDisc } = useStatsDisciplinas();
  const { rows: heatmap, loading: loadingHeat } = useStatsHeatmap();
  const { data: recs, loading: loadingRec } = useStatsRecomendacoes();

  const totalDisc = disciplinas.length;
  const melhores = useMemo(
    () => [...disciplinas].filter((d) => d.questoes >= 20).sort((a, b) => b.precisao - a.precisao).slice(0, 3),
    [disciplinas],
  );
  const piores = useMemo(
    () => [...disciplinas].filter((d) => d.questoes >= 20).sort((a, b) => a.precisao - b.precisao).slice(0, 3),
    [disciplinas],
  );

  if (loadingDash) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:flex-row md:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Painel avançado
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Estatísticas</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe sua evolução, identifique pontos fortes e priorize revisões.
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-3.5 w-3.5" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportPDF(dash, disciplinas, (recs?.mensagens ?? []).map((m) => m.texto))}>
              <FileText className="mr-2 h-4 w-4" /> Relatório PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportExcel(disciplinas, evolucao)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xls)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportCSV(disciplinas, evolucao)}>
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Estudado hoje" value={fmtDur(dash?.tempo.hoje_min ?? 0)}
             hint={`${fmtDur(dash?.tempo.semana_min ?? 0)} na semana`}
             icon={Clock} tint="from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/30" />
        <Kpi label="Precisão geral" value={`${dash?.questoes.precisao ?? 0}%`}
             hint={`${fmtN(dash?.questoes.acertos ?? 0)} / ${fmtN(dash?.questoes.total ?? 0)} questões`}
             icon={Target} tint="from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30" />
        <Kpi label="Sequência" value={`${dash?.sequencia.atual_dias ?? 0} dias`}
             hint={`Recorde: ${dash?.sequencia.maior_dias ?? 0} dias`}
             icon={Flame} tint="from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/30" />
        <Kpi label="Vitórias na Arena" value={fmtN(dash?.arena.vitorias ?? 0)}
             hint={`${fmtN(dash?.arena.podios ?? 0)} pódios · ${fmtN(dash?.arena.partidas ?? 0)} partidas`}
             icon={Trophy} tint="from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-500/30" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tempo médio/questão" value={`${dash?.questoes.tempo_medio_seg ?? 0}s`}
             icon={Zap} tint="from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" />
        <Kpi label="Nível" value={`Nv. ${dash?.perfil.nivel ?? 1}`}
             hint={`${fmtN(dash?.perfil.xp ?? 0)} XP totais`}
             icon={Award} tint="from-violet-500/20 to-violet-500/5 text-violet-300 border-violet-500/30" />
        <Kpi label="Liga" value={dash?.perfil.liga ?? "Bronze"}
             hint={`${fmtN(dash?.perfil.liga_pontos ?? 0)} LP`}
             icon={Crown} tint="from-yellow-500/20 to-yellow-500/5 text-yellow-300 border-yellow-500/30" />
        <Kpi label="Total estudado" value={`${((dash?.tempo.total_min ?? 0) / 60).toFixed(1)}h`}
             hint={`Este mês: ${fmtDur(dash?.tempo.mes_min ?? 0)}`}
             icon={TrendingUp} tint="from-teal-500/20 to-teal-500/5 text-teal-300 border-teal-500/30" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="evolucao">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        {/* Evolução */}
        <TabsContent value="evolucao" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? "default" : "outline"}
                onClick={() => setRange(r.value)}
                className="h-7 text-xs"
              >
                {r.label}
              </Button>
            ))}
          </div>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Questões respondidas & precisão
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {loadingEv ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolucao}>
                    <defs>
                      <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(142 76% 55%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(142 76% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="dia" fontSize={10} stroke="hsl(var(--muted-foreground))"
                           tickFormatter={(d: string) => d.slice(5).replace("-", "/")} />
                    <YAxis yAxisId="l" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="r" orientation="right" fontSize={10} stroke="hsl(142 76% 55%)" unit="%" domain={[0,100]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8, fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area yAxisId="l" type="monotone" dataKey="questoes" name="Questões"
                          stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gq)" />
                    <Area yAxisId="r" type="monotone" dataKey="precisao" name="Precisão %"
                          stroke="hsl(142 76% 55%)" strokeWidth={2} fill="url(#gp)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo estudado (minutos por dia)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="dia" fontSize={10} stroke="hsl(var(--muted-foreground))"
                         tickFormatter={(d: string) => d.slice(5).replace("-", "/")} />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="minutos" name="Minutos"
                        stroke="hsl(217 91% 60%)" strokeWidth={2} fill="url(#gt)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disciplinas */}
        <TabsContent value="disciplinas" className="mt-4 space-y-3">
          {loadingDisc ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : disciplinas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
              Nenhuma sessão registrada ainda. Estude algumas questões para ver seu desempenho por disciplina.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {disciplinas.map((d, i) => (
                <motion.div
                  key={d.materia}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border-border/60">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{d.materia}</span>
                        </div>
                        <Badge variant={d.precisao >= 75 ? "default" : d.precisao >= 55 ? "secondary" : "destructive"}
                               className="text-[10px]">
                          {d.precisao}%
                        </Badge>
                      </div>
                      <Progress value={d.precisao} className="h-1.5" />
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div><span className="text-foreground font-semibold">{fmtN(d.questoes)}</span> questões</div>
                        <div><span className="text-foreground font-semibold">{d.tempo_medio_seg}s</span> médio</div>
                        <div><span className="text-foreground font-semibold">{fmtDur(d.minutos)}</span> total</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            {totalDisc} disciplina(s) registrada(s) · assuntos aparecerão aqui conforme forem
            adicionados às sessões.
          </p>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="mt-4 grid gap-3 lg:grid-cols-3">
          <Card className="border-emerald-500/30 bg-emerald-500/[.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pontos fortes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {melhores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Complete mais questões para identificar seus pontos fortes.
                </p>
              )}
              {melhores.map((d) => (
                <div key={d.materia} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-2">
                  <span className="text-sm">{d.materia}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30" variant="outline">
                    <Percent className="mr-1 h-3 w-3" />{d.precisao}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-orange-500/[.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-400" /> Pontos de melhoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {piores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum ponto crítico detectado ainda.
                </p>
              )}
              {piores.map((d) => (
                <div key={d.materia} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-2">
                  <span className="text-sm">{d.materia}</span>
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30" variant="outline">
                    {d.precisao}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/[.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" /> Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingRec ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (recs?.mensagens ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Continue estudando para receber recomendações personalizadas.
                </p>
              ) : (
                recs!.mensagens.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs",
                      m.tipo === "positivo"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-100",
                    )}
                  >
                    {m.texto}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Comparação (preparada, sem dados) */}
          <Card className="border-border/60 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Comparação (em breve)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {["Você", "Média da plataforma", "Média da sua liga"].map((l, i) => (
                  <div key={l} className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {l}
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {i === 0 ? `${dash?.questoes.precisao ?? 0}%` : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Precisão geral</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Comparação com outros usuários será liberada após agregação global.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendário */}
        <TabsContent value="calendario" className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Mapa de calor anual</CardTitle>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span><b className="text-foreground">{dash?.sequencia.atual_dias ?? 0}</b> dias seguidos</span>
                <span>Recorde: <b className="text-foreground">{dash?.sequencia.maior_dias ?? 0}</b></span>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHeat ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <StatsHeatmap rows={heatmap} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Auxiliares ──────────────────────────────────────────────────────
function Kpi({
  label, value, hint, icon: Icon, tint,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn("border bg-gradient-to-br", tint)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
              {label}
            </div>
            <div className="mt-0.5 truncate text-xl font-bold text-foreground">{value}</div>
            {hint && <div className="mt-0.5 truncate text-[11px] opacity-70">{hint}</div>}
          </div>
          <div className="rounded-xl bg-background/40 p-2.5">
            <Icon className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function fmtN(n: number) { return (n ?? 0).toLocaleString("pt-BR"); }
function fmtDur(min: number) {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}
