import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Users, Swords, LogOut, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import {
  useArena,
  useArenaSala,
  useArenaMensagens,
  useArenaEnviarMensagem,
  useArenaEntrar,
  useArenaSair,
  useArenaTick,
  useArenaWalkover,
} from "@/api/hooks";
import { salaStatusToScreen, fetchArenaPerfisPublic, sairSala as sairSalaApi, type ArenaSalaDTO as ArenaSala } from "@/api/arena";
import { ArenaPartida } from "@/components/arena/ArenaPartida";
import { ArenaLobby } from "@/components/arena/ArenaLobby";
import { ArenaResultados } from "@/components/arena/ArenaResultados";
import { resolveArenaProfiles, type PublicArenaProfile } from "@/lib/profile.functions";


const ARENA_TEMPO_QUESTAO_SEGUNDOS = 25;

export const Route = createFileRoute("/_app/arena/$salaId")({
  component: SalaPage,
});

type Msg = {
  id: string;
  sala_id: string;
  user_id: string;
  texto: string;
  created_at: string;
};
type PerfilLite = {
  id: string;
  username: string | null;
  nome: string | null;
  avatar_url: string | null;
  liga: string | null;
  nivel?: number | null;
};

async function carregarPerfisArena(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return [] as PerfilLite[];

  try {
    return (await resolveArenaProfiles({ data: { ids: uniqueIds } })) as PerfilLite[];
  } catch (error) {
    console.warn("[arena] resolver perfis via servidor falhou; tentando leitura pública", error);
    const rows = await fetchArenaPerfisPublic(uniqueIds);
    return rows.map((profile) => ({
      id: profile.id,
      username: profile.username ?? null,
      nome: profile.nome ?? null,
      avatar_url: profile.avatar_url ?? null,
      liga: profile.liga ?? null,
      nivel: profile.nivel ?? null,
    }));
  }
}

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

function SalaPage() {
  const { salaId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: arenaData } = useArena();
  const participantes = arenaData?.participantes ?? [];
  const salaLista = useMemo<ArenaSala | undefined>(
    () => arenaData?.salas.find((s) => s.id === salaId),
    [arenaData?.salas, salaId],
  );

  const { data: salaAoVivo } = useArenaSala(salaId);
  const sala = salaAoVivo ?? salaLista;

  const inSala = useMemo(
    () => participantes.some((p) => p.sala_id === salaId && p.user_id === user?.id),
    [participantes, salaId, user?.id],
  );
  const players = useMemo(
    () => participantes.filter((p) => p.sala_id === salaId && p.role === "player"),
    [participantes, salaId],
  );

  // Perfis dos jogadores
  const [perfis, setPerfis] = useState<Record<string, PerfilLite>>({});
  useEffect(() => {
    const ids = players.map((p) => p.user_id).filter((id) => !perfis[id]);
    if (ids.length === 0) return;
    void carregarPerfisArena(ids).then((data) => {
      if (data.length === 0) return;
      setPerfis((cur) => {
        const next = { ...cur };
        for (const p of data) next[p.id] = p;
        return next;
      });
    });
  }, [players, perfis]);

  // Chat via camada oficial
  const { data: mensagens = [] } = useArenaMensagens(salaId);
  const enviarMut = useArenaEnviarMensagem();
  const entrarMut = useArenaEntrar();
  const sairMut = useArenaSair();
  const tickMut = useArenaTick();
  const walkoverMut = useArenaWalkover();

  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length]);

  // Pré-carrega perfis de quem mandou mensagem
  useEffect(() => {
    const ids = Array.from(new Set(mensagens.map((m) => m.user_id))).filter((id) => !perfis[id]);
    if (ids.length === 0) return;
    void carregarPerfisArena(ids).then((data) => {
      if (data.length === 0) return;
      setPerfis((cur) => {
        const next = { ...cur };
        for (const p of data) next[p.id] = p;
        return next;
      });
    });
  }, [mensagens, perfis]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !user) return;
    setTexto("");
    try {
      await enviarMut.mutateAsync({ salaId, userId: user.id, texto: t });
    } catch {
      toast.error("Não foi possível enviar");
      setTexto(t);
    }
  };

  const handleEntrar = async () => {
    try {
      const r = await entrarMut.mutateAsync(salaId);
      if (!r.ok) {
        toast.error(r.error ?? "Não foi possível entrar");
        return;
      }
      toast.success(sala?.status === "em_partida" ? "Você entrou na partida" : "Você entrou na sala");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao entrar");
    }
  };

  const handleSair = async () => {
    try {
      await sairMut.mutateAsync(salaId);
      toast.success("Saiu da sala");
      navigate({ to: "/arena" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sair");
    }
  };

  const cd = useCountdown(sala?.countdown_ends_at ?? null);
  const partidaCd = useCountdown(sala?.status === "em_partida" ? sala.started_at ?? null : null);
  const partidaAgendada = sala?.status === "em_partida" && !!sala.started_at && partidaCd > 0;
  const faseRestante = useCountdown(sala?.status === "em_partida" && !partidaAgendada ? sala.fase_ends_at ?? null : null);

  // Estado da sala é sincronizado por `useArenaSala` + `useArena` (realtime).

  useEffect(() => {
    if (!sala) return;

    let cancelled = false;
    let running = false;

    const run = async () => {
      if (running) return;
      const now = Date.now();
      const isWalkover = sala.status === "em_partida" && players.length === 1;
      const deveAvancar =
        (sala.status === "aguardando" && players.length >= 2) ||
        (sala.status === "contagem" && !!sala.countdown_ends_at && new Date(sala.countdown_ends_at).getTime() <= now) ||
        isWalkover;

      if (!deveAvancar) return;

      running = true;
      try {
        if (isWalkover) {
          await walkoverMut.mutateAsync(sala.id);
        } else {
          await tickMut.mutateAsync(sala.id);
        }
        if (cancelled) return;
      } finally {
        running = false;
      }
    };

    void run();
    const interval = window.setInterval(() => void run(), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, sala]);

  // Snapshot da última sala em resultado — mantém a tela de vencedor visível
  // mesmo que o backend reinicie a sala para "aguardando" logo em seguida.
  const [resultadoSticky, setResultadoSticky] = useState<ArenaSala | null>(null);
  useEffect(() => {
    if (!sala) return;
    if (sala.status === "resultado") {
      setResultadoSticky({ ...sala });
    } else if (sala.status === "em_partida") {
      // nova partida começou — limpa o snapshot anterior
      setResultadoSticky(null);
    }
  }, [sala]);

  // Auto-sair: se o usuário ficar mais de 2 minutos com a aba oculta/fora,
  // remove-o automaticamente da sala. Também sai ao fechar/recarregar a página.
  useEffect(() => {
    if (!inSala || !user) return;
    const AUSENCIA_MAX_MS = 2 * 60 * 1000;
    let hiddenSince: number | null = null;
    let timer: number | null = null;

    const autoSair = async () => {
      try {
        await sairSalaApi(salaId);
      } catch {
        /* noop */
      }
      toast.info("Você saiu da sala por inatividade (2 min fora)");
      navigate({ to: "/arena" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (document.visibilityState === "hidden") void autoSair();
        }, AUSENCIA_MAX_MS);
      } else {
        hiddenSince = null;
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
      }
    };

    const onUnload = () => {
      // best-effort: fire-and-forget para liberar vaga ao fechar/recarregar
      try {
        void sairSalaApi(salaId);
      } catch {
        /* noop */
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [inSala, navigate, salaId, user]);

  if (!sala) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-muted-foreground">
        <p>Sala não encontrada ou ainda carregando...</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/arena"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Arena</Link>
        </Button>
      </div>
    );
  }

  const vencedorPorWO = sala.status === "em_partida" && players.length === 1;
  const salaVisual: ArenaSala = vencedorPorWO
    ? {
        ...sala,
        status: "resultado",
        status_fase: "resultado",
        fase_ends_at: sala.fase_ends_at ?? new Date(Date.now() + 45_000).toISOString(),
      }
    : resultadoSticky && sala.status !== "em_partida" && sala.status !== "contagem"
    ? { ...resultadoSticky, status: "resultado", status_fase: "resultado" }
    : sala;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/arena"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{salaVisual.nome}</h1>
            <p className="text-sm text-muted-foreground">{salaVisual.materia} · {salaVisual.num_questoes} questões · {ARENA_TEMPO_QUESTAO_SEGUNDOS}s por questão</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{vencedorPorWO ? "resultado" : salaVisual.status.replace("_", " ")}</Badge>
          {inSala ? (
            <Button variant="outline" onClick={handleSair}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          ) : (
            <Button onClick={() => void handleEntrar()} disabled={players.length >= salaVisual.max_jogadores}>
              {salaVisual.status === "em_partida" ? "Entrar e jogar" : "Entrar"}
            </Button>
          )}
        </div>
      </div>

      {(() => {
        const screen = salaStatusToScreen(salaVisual.status);
        if (screen === "results") {
          return (
            <ArenaResultados
              sala={salaVisual}
              players={players.map((p) => ({ user_id: p.user_id, role: p.role }))}
              perfis={perfis}
              currentUserId={user?.id}
              onJogarNovamente={() => { /* volta ao lobby — nunca inicia automático */ }}
              onVoltarLobby={() => { /* já está na sala; a máquina de estados volta a waiting */ }}
              onSair={handleSair}
            />
          );
        }
        if (screen === "match" && salaVisual.started_at && !partidaAgendada) {
          return (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-rose-300 flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" /> Em partida — questão {(salaVisual.rodada_atual ?? 0) + 1}/{salaVisual.num_questoes}
                </p>
                <p className="mt-1 text-xs text-rose-200/80">
                  {salaVisual.status_fase === "resultado" ? "Resultado da rodada" : "Respondendo"} · próxima fase em {faseRestante}s
                </p>
              </div>
              <ArenaPartida
                salaId={salaVisual.id}
                startedAt={salaVisual.started_at}
                numQuestoes={salaVisual.num_questoes}
                rodadaAtual={salaVisual.rodada_atual ?? 0}
                statusFase={salaVisual.status_fase ?? "respondendo"}
                faseEndsAt={salaVisual.fase_ends_at}
                canPlay={inSala}
                onJoin={handleEntrar}
                jogadores={players.map((p) => ({
                  user_id: p.user_id,
                  nome: perfis[p.user_id]?.nome ?? perfis[p.user_id]?.username ?? "Jogador",
                  username: perfis[p.user_id]?.username ?? null,
                }))}
              />
            </motion.div>
          );
        }
        // Lobby (aguardando / contagem / finalizada)
        return (
          <ArenaLobby
            sala={salaVisual}
            players={players}
            perfis={perfis}
            inSala={inSala}
            countdownSeconds={partidaAgendada ? partidaCd : cd}
          />
        );
      })()}
    </div>
  );
}

