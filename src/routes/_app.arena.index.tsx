import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, FileQuestion, Clock, Filter, Swords, LogOut } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Pré-carrega deps usadas na página da sala — evita "optimize deps reload" no 1º clique em Entrar/Abrir.
import "@/components/ui/scroll-area";
import "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useArena, useArenaEntrar, useArenaSair } from "@/api/hooks";
import type { ArenaSalaDTO as ArenaSala } from "@/api/arena";
import { toast } from "sonner";

const ARENA_TEMPO_QUESTAO_SEGUNDOS = 25;

export const Route = createFileRoute("/_app/arena/")({
  head: () => ({
    meta: [
      { title: "Arena Multiplayer — FinSmart Tec" },
      { name: "description", content: "Dispute partidas em tempo real contra outros concurseiros na Arena PM-AL 2026." },
    ],
  }),
  component: ArenaPage,
});

function useCountdown(targetIso: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [targetIso]);
  if (!targetIso) return 0;
  return Math.max(0, Math.ceil((new Date(targetIso).getTime() - now) / 1000));
}

function statusBadge(s: ArenaSala["status"]) {
  switch (s) {
    case "aguardando": return { label: "Aguardando jogadores", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" };
    case "contagem":   return { label: "Iniciando...",         cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",     dot: "bg-amber-400 animate-pulse" };
    case "em_partida": return { label: "Em partida",           cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",         dot: "bg-rose-400" };
    case "resultado":  return { label: "Resultado",            cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",   dot: "bg-violet-400" };
    case "finalizando":return { label: "Finalizando",          cls: "bg-slate-500/15 text-slate-300 border-slate-500/30",      dot: "bg-slate-400" };
    default:           return { label: "—",                    cls: "bg-slate-500/15 text-slate-300 border-slate-500/30",      dot: "bg-slate-400" };
  }
}

function SalaCard({ sala, count, isIn }: { sala: ArenaSala; count: number; isIn: boolean }) {
  const navigate = useNavigate();
  const entrarMut = useArenaEntrar();
  const sairMut = useArenaSair();
  const lotada = count >= sala.max_jogadores;
  const cd = useCountdown(sala.countdown_ends_at);
  const tempoEstimado = Math.max(1, Math.round((sala.num_questoes * ARENA_TEMPO_QUESTAO_SEGUNDOS) / 60));
  const meta = statusBadge(sala.status);

  const handleEntrar = async () => {
    try {
      if (!isIn) {
        const res = await entrarMut.mutateAsync(sala.id);
        if (!res.ok) { toast.error(res.error ?? "Não foi possível entrar"); return; }
      }
      navigate({ to: "/arena/$salaId", params: { salaId: sala.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao entrar");
    }
  };
  const handleAbrir = () => navigate({ to: "/arena/$salaId", params: { salaId: sala.id } });
  const handleSair = async () => {
    try { await sairMut.mutateAsync(sala.id); toast.success("Saiu da sala"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao sair"); }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group"
    >
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/70 backdrop-blur transition-shadow hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/.45)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Swords className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold tracking-tight">{sala.nome}</CardTitle>
          </div>
          <Badge variant="outline" className={meta.cls}>
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-sky-400" /><span className="font-medium text-foreground">{count}/{sala.max_jogadores}</span> jogadores</div>
            <div className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-violet-400" /><span className="truncate">{sala.materia}</span></div>
            <div className="flex items-center gap-1.5"><FileQuestion className="h-3.5 w-3.5 text-amber-400" />{sala.num_questoes} questões</div>
            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-rose-400" />{ARENA_TEMPO_QUESTAO_SEGUNDOS}s · ~{tempoEstimado}min</div>
          </div>

          {/* Barra de capacidade */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary-glow"
              animate={{ width: `${(count / sala.max_jogadores) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
          </div>

          <AnimatePresence>
            {sala.status === "contagem" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm font-semibold text-amber-300"
              >
                Iniciando em {cd}s...
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {isIn ? (
              <>
                <Button className="flex-1" onClick={handleAbrir}>Abrir sala</Button>
                <Button variant="outline" size="icon" onClick={handleSair} title="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : lotada ? (
              <Button variant="secondary" className="w-full" onClick={handleAbrir}>
                {sala.status === "em_partida" ? "Assistir partida" : "Sala Lotada — Espectar"}
              </Button>
            ) : sala.status === "em_partida" ? (
              <Button className="w-full" onClick={handleEntrar}>Entrar na partida</Button>
            ) : sala.status === "contagem" ? (
              <Button className="w-full" onClick={handleEntrar}>Entrar (iniciando)</Button>
            ) : (
              <Button className="w-full" onClick={handleEntrar}>Entrar</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ArenaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading: loading } = useArena();
  const salas = data?.salas ?? [];
  const participantes = data?.participantes ?? [];
  const [busca, setBusca] = useState("");
  const [materia, setMateria] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");

  const countBySala = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of participantes) m.set(p.sala_id, (m.get(p.sala_id) ?? 0) + 1);
    return m;
  }, [participantes]);

  const minhasSalas = useMemo(
    () => new Set(participantes.filter((p) => p.user_id === user?.id).map((p) => p.sala_id)),
    [participantes, user?.id],
  );

  const materias = useMemo(
    () => Array.from(new Set(salas.map((s) => s.materia))).sort(),
    [salas],
  );

  const filtradas = useMemo(
    () =>
      salas.filter((s) => {
        if (busca && !s.nome.toLowerCase().includes(busca.toLowerCase())) return false;
        if (materia !== "todas" && s.materia !== materia) return false;
        if (status !== "todos" && s.status !== status) return false;
        return true;
      }),
    [salas, busca, materia, status],
  );

  const onlinePlayers = participantes.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arena Multiplayer</h1>
          <p className="text-muted-foreground">Partidas em tempo real · PM-AL 2026 · começa com 2+ jogadores (até 8)</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2 text-sm backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">{onlinePlayers} jogadores online</span>
          <span className="text-muted-foreground">· {salas.length} salas ativas</span>
        </div>
      </div>



      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar sala..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
        <Select value={materia} onValueChange={setMateria}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Matéria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as matérias</SelectItem>
            {materias.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="contagem">Iniciando</SelectItem>
            <SelectItem value="em_partida">Em partida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Salas */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-border/60 bg-card/40" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma sala encontrada com esses filtros.</CardContent></Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtradas.map((s) => (
              <SalaCard key={s.id} sala={s} count={countBySala.get(s.id) ?? 0} isIn={minhasSalas.has(s.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
