import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSimulacaoEstado,
  useResponderSimulacao,
  useMarcarRevisaoSimulacao,
  useAutosaveSimulacao,
  useFinalizarSimulacao,
  useCancelarSimulacao,
} from "@/api";
import { useCronometro, formatarTempo, type SimulationState } from "@/api/simulations";

export const Route = createFileRoute("/_app/simulados/$id")({
  component: SimuladoRunner,
});

function SimuladoRunner() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: estado, isLoading: carregando, error } = useSimulacaoEstado(id);
  const responderMut = useResponderSimulacao(id);
  const marcarMut = useMarcarRevisaoSimulacao(id);
  const autosaveMut = useAutosaveSimulacao(id);
  const finalizarMut = useFinalizarSimulacao(id);
  const cancelarMut = useCancelarSimulacao(id);
  const [atual, setAtual] = useState(0);
  const [confirmarFinal, setConfirmarFinal] = useState(false);

  // Sincroniza posição inicial do servidor
  useEffect(() => {
    if (estado && estado.questao_atual !== atual) setAtual(estado.questao_atual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado?.id]);

  const ativo = estado?.status === "em_andamento";
  const segundos = useCronometro(
    estado?.tempo_restante_segundos ?? 0,
    !!ativo,
    (rest) => { if (estado) autosaveMut.mutate({ questaoAtual: atual, tempoRestante: rest }); },
    async () => { await onFinalizar(); toast.info("Tempo esgotado — simulado finalizado."); },
  );

  const respostasMap = useMemo(() => {
    const m = new Map<number, SimulationState["respostas"][number]>();
    estado?.respostas.forEach(r => m.set(r.ordem, r));
    return m;
  }, [estado?.respostas]);

  useEffect(() => {
    if (!ativo || !estado) return;
    autosaveMut.mutate({ questaoAtual: atual, tempoRestante: segundos });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual]);

  async function onFinalizar() {
    if (!estado) return;
    try {
      await finalizarMut.mutateAsync();
      nav({ to: "/simulados/$id/relatorio", params: { id: estado.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao finalizar");
    } finally {
      setConfirmarFinal(false);
    }
  }

  if (carregando) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !estado) return <div className="mx-auto max-w-lg p-8 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><p>{(error as Error)?.message ?? "Simulado não encontrado"}</p></div>;

  if (estado.status !== "em_andamento") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center space-y-4">
        <p className="text-lg font-medium">Este simulado já foi {estado.status === "finalizado" ? "finalizado" : "cancelado"}.</p>
        {estado.status === "finalizado" && (
          <Button onClick={() => nav({ to: "/simulados/$id/relatorio", params: { id: estado.id } })}>Ver relatório</Button>
        )}
      </div>
    );
  }

  const q = estado.questoes[atual];
  const respAtual = respostasMap.get(atual);
  const respondidas = estado.respostas.filter(r => r.resposta !== null).length;
  const pendentes = estado.qtd - respondidas;
  const marcadas = estado.respostas.filter(r => r.marcada_revisao).length;

  const responder = (ordem: number, resposta: { ce?: boolean; idx?: number }) =>
    responderMut.mutateAsync({ ordem, resposta, tempoSegundos: 0 }).catch(e =>
      toast.error(e instanceof Error ? e.message : "Falha ao responder"),
    );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_260px]">
      {/* Header + Questão */}
      <div className="space-y-4">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{estado.titulo}</h1>
              <p className="text-xs text-muted-foreground">Questão {atual + 1} de {estado.qtd} · {respondidas} respondidas · {marcadas} marcadas</p>
            </div>
            <div className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-mono tabular-nums",
              segundos < 60 ? "border-destructive/50 text-destructive" : "border-border/60")}>
              <Clock className="h-4 w-4" /> {formatarTempo(segundos)}
            </div>
          </CardContent>
        </Card>

        <Progress value={((atual + 1) / estado.qtd) * 100} />

        <AnimatePresence mode="wait">
          <motion.div key={atual} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="border-border/60 bg-card/80">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{q.materia}</Badge>
                  {q.banca && <Badge variant="secondary">{q.banca}</Badge>}
                  {q.ano && <span>· {q.ano}</span>}
                  <Badge>{q.tipo === "CE" ? "Certo / Errado" : "Múltipla escolha"}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-base leading-relaxed">{q.enunciado}</p>

                {q.tipo === "CE" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <OpcaoBtn
                      selecionada={respAtual?.resposta?.ce === true}
                      onClick={() => responder(atual, { ce: true })}
                      icon={<CheckCircle2 className="h-4 w-4" />} label="Certo" />
                    <OpcaoBtn
                      selecionada={respAtual?.resposta?.ce === false}
                      onClick={() => responder(atual, { ce: false })}
                      icon={<XCircle className="h-4 w-4" />} label="Errado" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {(q.alternativas ?? []).map((alt, i) => (
                      <OpcaoBtn key={i}
                        selecionada={respAtual?.resposta?.idx === i}
                        onClick={() => responder(atual, { idx: i })}
                        label={`${String.fromCharCode(65+i)}) ${alt}`} />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => marcarMut.mutate({ ordem: atual, marcada: !respAtual?.marcada_revisao })}>
                    <Flag className={cn("mr-2 h-4 w-4", respAtual?.marcada_revisao && "fill-primary text-primary")} />
                    {respAtual?.marcada_revisao ? "Remover marcação" : "Marcar para revisão"}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={atual === 0} onClick={() => setAtual(a => Math.max(0, a - 1))}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                    </Button>
                    <Button size="sm" disabled={atual >= estado.qtd - 1} onClick={() => setAtual(a => Math.min(estado.qtd - 1, a + 1))}>
                      Próxima <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={async () => { await cancelarMut.mutateAsync(); nav({ to: "/simulados" }); }}>Cancelar simulado</Button>
          <Button onClick={() => setConfirmarFinal(true)}>Finalizar</Button>
        </div>
      </div>

      {/* Painel lateral */}
      <Card className="h-fit border-border/60 bg-card/80 lg:sticky lg:top-4">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium">Painel · {respondidas}/{estado.qtd}</h3>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {estado.questoes.map((_, i) => {
              const r = respostasMap.get(i);
              const respondida = !!r?.resposta;
              const marcada = !!r?.marcada_revisao;
              return (
                <button key={i} onClick={() => setAtual(i)} className={cn(
                  "flex h-8 items-center justify-center rounded text-xs font-medium transition-all",
                  atual === i ? "ring-2 ring-primary" : "",
                  marcada ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                  : respondida ? "bg-primary/20 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}>{i + 1}</button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-primary" /> Respondida</p>
            <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-500" /> Revisão</p>
            <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" /> Pendente</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmarFinal} onOpenChange={setConfirmarFinal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar simulado?</DialogTitle></DialogHeader>
          <div className="space-y-1 py-2 text-sm">
            <p><b>{respondidas}</b> respondidas</p>
            <p><b>{pendentes}</b> pendentes</p>
            <p>Tempo restante: <b>{formatarTempo(segundos)}</b></p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmarFinal(false)}>Voltar</Button>
            <Button onClick={onFinalizar} disabled={finalizarMut.isPending}>{finalizarMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OpcaoBtn({ selecionada, onClick, icon, label }: { selecionada: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all",
      selecionada ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:border-primary/50",
    )}>{icon}<span>{label}</span></button>
  );
}
