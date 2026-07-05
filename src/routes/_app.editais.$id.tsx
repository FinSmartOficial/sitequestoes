import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileBadge, CalendarDays, Building2, MapPin, Users2, ExternalLink,
  Target, Clock, TrendingUp, CheckCircle2, PlayCircle, Circle, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEditalProgresso, useMetaHoje } from "@/api";

export const Route = createFileRoute("/_app/editais/$id")({
  head: () => ({ meta: [{ title: "Progresso do Edital — FinSmart Tec" }] }),
  component: EditalDetalhePage,
});

const STATUS_LABEL: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  nao_iniciada: { label: "Não iniciada", color: "text-muted-foreground", icon: Circle },
  em_andamento: { label: "Em andamento", color: "text-sky-400", icon: PlayCircle },
  concluida:    { label: "Concluída",    color: "text-emerald-400", icon: CheckCircle2 },
  dominada:     { label: "Dominada",     color: "text-primary",     icon: Sparkles },
};

function diasAte(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((+new Date(iso) - Date.now()) / 86400000);
}

function EditalDetalhePage() {
  const { id } = Route.useParams();
  const { data, loading, setStatusDisciplina } = useEditalProgresso(id);
  const { meta } = useMetaHoje(60);

  if (loading || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const { edital, disciplinas, resumo, percentual } = data;
  const dias = diasAte(edital.data_prova);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <Link
        to="/editais"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos editais
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/.6)]">
            <FileBadge className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {edital.banca ?? "—"} {edital.ano ? `· ${edital.ano}` : ""}
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight">{edital.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {edital.cargo ?? edital.area ?? "Cargo não informado"}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {edital.orgao && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {edital.orgao}
                </span>
              )}
              {(edital.estado || edital.cidade) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[edital.cidade, edital.estado].filter(Boolean).join(" / ")}
                </span>
              )}
              {typeof edital.vagas === "number" && (
                <span className="inline-flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" /> {edital.vagas} vagas
                </span>
              )}
              {edital.data_prova && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Prova: {new Date(edital.data_prova).toLocaleDateString("pt-BR")}
                </span>
              )}
              {edital.link_oficial && (
                <a
                  href={edital.link_oficial}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Edital oficial
                </a>
              )}
            </div>
          </div>
          {dias !== null && dias >= 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{dias}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">
                dias p/ prova
              </div>
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Progresso geral</span>
            <span className="font-bold text-primary">{percentual}%</span>
          </div>
          <Progress value={percentual} className="h-3" />
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>✅ {resumo.concluidas} concluídas</span>
            <span>🎯 {resumo.em_andamento} em andamento</span>
            <span>⚪ {resumo.nao_iniciadas} pendentes</span>
            <span>📝 {resumo.questoes_total} questões estimadas</span>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Disciplinas */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> Disciplinas do edital
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {disciplinas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma disciplina cadastrada.
              </p>
            )}
            {disciplinas.map((d) => {
              const s = STATUS_LABEL[d.status] ?? STATUS_LABEL.nao_iniciada;
              const Icon = s.icon;
              return (
                <motion.div
                  key={d.id}
                  layout
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <Icon className={`h-5 w-5 ${s.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.nome}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Peso {d.peso} · {d.qtd_questoes} questões
                      {d.percentual ? ` · ${d.percentual}% da prova` : ""}
                    </div>
                  </div>
                  <Select
                    value={d.status}
                    onValueChange={(v) => setStatusDisciplina(d.id, v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        {/* Meta do dia */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Meta de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!meta || meta.itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Marque disciplinas como <b>em andamento</b> para gerar sua meta diária.
              </p>
            ) : (
              <>
                <Badge variant="secondary" className="border-0 bg-primary/15 text-primary">
                  {meta.minutos_total ?? 60} min sugeridos
                </Badge>
                <ul className="space-y-2">
                  {meta.itens.map((it) => (
                    <li
                      key={it.disciplina_id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{it.disciplina}</span>
                      <span className="text-xs font-semibold text-primary">
                        {it.minutos} min
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" className="w-full">
                  <Link to="/questoes" search={{}}>
                    <TrendingUp className="mr-1.5 h-4 w-4" /> Começar a estudar
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
