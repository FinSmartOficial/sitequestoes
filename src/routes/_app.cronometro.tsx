import { createFileRoute } from "@tanstack/react-router";
import { Timer, Play, Pause, Square, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimerSessions } from "@/api";

export const Route = createFileRoute("/_app/cronometro")({
  head: () => ({
    meta: [
      { title: "Cronômetro — FinSmart Tec" },
      { name: "description", content: "Pomodoro e cronômetro de estudo em tempo real." },
    ],
  }),
  component: CronometroPage,
});

function fmt(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function CronometroPage() {
  const { rows: sessoes, insert, remove } = useTimerSessions();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [rotulo, setRotulo] = useState("");
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running]);

  async function finalizar() {
    if (seconds === 0) return;
    const r = await insert({
      materia: rotulo || "Sessão",
      minutos: Math.max(1, Math.round(seconds / 60)),
      questoes_total: 0,
      questoes_acertos: 0,
      data: new Date().toISOString().slice(0, 10),
      observacao: `Cronômetro: ${fmt(seconds)}`,
    });
    if (r) { setSeconds(0); setRunning(false); setRotulo(""); }
  }

  const totalMin = sessoes.reduce((s, x) => s + x.minutos, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title="Tempo de Operação" description="Controle de tempo líquido por sessão — pause, retome e encerre missões." icon={Timer} />

      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/80">
        <CardContent className="flex flex-col items-center gap-6 py-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Tempo de operação</p>
          <p className="font-mono text-6xl font-bold tracking-tight text-foreground tabular-nums sm:text-7xl">{fmt(seconds)}</p>
          <Input
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            placeholder="O que está estudando? (opcional)"
            className="max-w-sm text-center"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {!running ? (
              <Button size="lg" onClick={() => setRunning(true)}><Play className="mr-2 h-4 w-4" /> Iniciar</Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => setRunning(false)}><Pause className="mr-2 h-4 w-4" /> Pausar</Button>
            )}
            <Button size="lg" variant="outline" onClick={finalizar} disabled={seconds === 0}><Square className="mr-2 h-4 w-4" /> Encerrar</Button>
            <Button size="lg" variant="ghost" onClick={() => { setSeconds(0); setRunning(false); }}><RotateCcw className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Pomodoro:</span>
            {[25, 50, 90].map((m) => (
              <Button key={m} size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => { setSeconds(m * 60); setRunning(true); }}>
                {m}min
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Missões encerradas</span>
            <span className="text-sm font-normal text-muted-foreground">Total <span className="font-mono text-foreground">{Math.floor(totalMin / 60)}h {totalMin % 60}m</span></span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessoes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma sessão encerrada ainda.</p>
          ) : (
            sessoes.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{s.materia}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-foreground">{Math.floor(s.minutos / 60)}h {s.minutos % 60}m</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
