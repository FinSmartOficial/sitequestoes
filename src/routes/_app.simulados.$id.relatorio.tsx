import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, Target, Clock, TrendingUp, TrendingDown, Loader2, CheckCircle2, XCircle, MinusCircle, ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSimulacaoRelatorio } from "@/api";
import { formatarTempo } from "@/api/simulations";

export const Route = createFileRoute("/_app/simulados/$id/relatorio")({
  component: RelatorioSimulado,
});

function RelatorioSimulado() {
  const { id } = Route.useParams();
  const { data: rel, isLoading: carregando, error } = useSimulacaoRelatorio(id);

  if (carregando) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !rel) return <div className="mx-auto max-w-lg p-8 text-center text-destructive">{(error as Error)?.message ?? "Relatório não encontrado"}</div>;


  const r = rel.simulado.resultado;
  const porMat = Object.entries(r.por_materia);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={rel.simulado.titulo}
        description={`Finalizado em ${new Date(rel.simulado.finalizado_em).toLocaleString("pt-BR")}`}
        icon={Trophy}
        action={<Button asChild variant="ghost"><Link to="/simulados"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metrica icon={Target} label="Precisão" value={`${r.precisao}%`} />
        <Metrica icon={Trophy} label="Pontuação" value={String(r.pontuacao)} />
        <Metrica icon={Clock} label="Tempo total" value={formatarTempo(r.tempo_total_segundos)} />
        <Metrica icon={TrendingUp} label="Tempo médio" value={`${Math.round(r.tempo_medio_segundos)}s`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCard cor="text-emerald-500" icon={CheckCircle2} label="Acertos" value={r.acertos} total={r.total} />
        <MiniCard cor="text-destructive" icon={XCircle} label="Erros" value={r.erros} total={r.total} />
        <MiniCard cor="text-muted-foreground" icon={MinusCircle} label="Em branco" value={r.branco} total={r.total} />
      </div>

      {/* Análise */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Análise automática</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {rel.analise.melhor_disciplina && (
            <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Melhor disciplina</p><p className="font-medium">{rel.analise.melhor_disciplina}</p></div>
          )}
          {rel.analise.pior_disciplina && (
            <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-destructive" /> Pior disciplina</p><p className="font-medium">{rel.analise.pior_disciplina}</p></div>
          )}
          <div><p className="mb-1 text-xs text-muted-foreground">Sugestão</p><p className="font-medium">{rel.analise.sugestao}</p></div>
        </CardContent>
      </Card>

      {/* Desempenho por matéria */}
      {porMat.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Desempenho por disciplina</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {porMat.map(([mat, s]) => {
              const pct = s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0;
              return (
                <div key={mat}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{mat}</span>
                    <span className="text-muted-foreground">{s.acertos}/{s.total} · {pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Gabarito comentado */}
      <Card>
        <CardHeader><CardTitle className="text-base">Gabarito comentado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rel.itens.map(it => (
            <motion.div key={it.ordem} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn("rounded-lg border p-4",
                it.correta === true && "border-emerald-500/40 bg-emerald-500/5",
                it.correta === false && "border-destructive/40 bg-destructive/5",
                it.correta === null && "border-border/60")}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">#{it.ordem + 1}</Badge>
                <Badge variant="secondary">{it.materia}</Badge>
                {it.correta === true && <Badge className="bg-emerald-600">Acerto</Badge>}
                {it.correta === false && <Badge variant="destructive">Erro</Badge>}
                {it.correta === null && <Badge variant="outline">Em branco</Badge>}
              </div>
              <p className="mb-2 whitespace-pre-wrap text-sm">{it.enunciado}</p>
              <div className="mb-2 text-sm">
                {it.tipo === "CE" ? (
                  <p>Gabarito: <b>{it.gabarito_ce ? "Certo" : "Errado"}</b> · Sua resposta: <b>{it.resposta?.ce === undefined ? "—" : it.resposta.ce ? "Certo" : "Errado"}</b></p>
                ) : (
                  <p>Gabarito: <b>{typeof it.gabarito_idx === "number" ? String.fromCharCode(65+it.gabarito_idx) : "—"}</b> · Sua resposta: <b>{typeof it.resposta?.idx === "number" ? String.fromCharCode(65+it.resposta.idx) : "—"}</b></p>
                )}
              </div>
              {(it.explicacao || it.comentario) && (
                <p className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">{it.explicacao || it.comentario}</p>
              )}
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metrica({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card><CardContent className="flex items-center gap-3 p-4">
      <div className="rounded-md bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums">{value}</p></div>
    </CardContent></Card>
  );
}
function MiniCard({ icon: Icon, label, value, total, cor }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card><CardContent className="p-4">
      <div className="mb-1 flex items-center gap-2 text-sm"><Icon className={cn("h-4 w-4", cor)} /> {label}</div>
      <p className="text-2xl font-semibold tabular-nums">{value}<span className="text-sm text-muted-foreground"> / {total} · {pct}%</span></p>
    </CardContent></Card>
  );
}
