import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRankingTop, useRanking } from "@/api/hooks";
import { searchRankingUsers, type RankingRowDTO } from "@/api/rankings";
import { cn } from "@/lib/utils";
import { RankBadge } from "@/components/xp/RankBadge";

export const Route = createFileRoute("/_app/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — FinSmart Tec" },
      { name: "description", content: "Rankings globais, regionais e por concurso. Acompanhe sua evolução e compete com milhares de estudantes." },
    ],
  }),
  component: RankingsPage,
});

const MEDALS = ["from-amber-300 to-yellow-500", "from-slate-300 to-slate-500", "from-orange-400 to-amber-700"];

// Ordem oficial das abas do ranking + rótulos amigáveis
const SLUG_ORDER: Record<string, number> = {
  global_questoes: 1,
  global_tempo: 2,
  global_nivel: 3,
  global_xp: 4,
  global_precisao: 5,
  global_lp: 6,
};
const TAB_LABELS: Record<string, string> = {
  global_questoes: "Questões",
  global_tempo: "Tempo",
  global_nivel: "Nível",
  global_xp: "XP",
  global_precisao: "Precisão",
  global_lp: "Liga",
};

function formatValor(criterio: string | undefined, valor: number): { valor: string; unidade: string } {
  const n = Number(valor) || 0;
  switch (criterio) {
    case "questoes":
      return { valor: n.toLocaleString("pt-BR"), unidade: "respondidas" };
    case "tempo": {
      const h = Math.floor(n / 60);
      const m = Math.round(n % 60);
      return { valor: h > 0 ? `${h}h ${m}min` : `${m} min`, unidade: "estudados" };
    }
    case "nivel":
      return { valor: n.toLocaleString("pt-BR"), unidade: "nível" };
    case "xp":
      return { valor: n.toLocaleString("pt-BR"), unidade: "XP" };
    case "precisao":
      return { valor: `${n.toFixed(1)}%`, unidade: "acerto" };
    case "lp":
      return { valor: n.toLocaleString("pt-BR"), unidade: "pontos de liga" };
    default:
      return { valor: n.toLocaleString("pt-BR"), unidade: "pontos" };
  }
}

const TAB_ORDER = Object.keys(SLUG_ORDER).sort(
  (a, b) => (SLUG_ORDER[a] ?? 99) - (SLUG_ORDER[b] ?? 99),
);

function criterioFromSlug(slug: string): string {
  return slug.replace(/^global_/, "");
}

function RankingsPage() {
  const [slug, setSlug] = useState<string>("global_questoes");
  const { data: top = [], isLoading: loading } = useRankingTop(slug, 100);
  const { data: me } = useRanking(slug);
  const [q, setQ] = useState("");
  const [searchRes, setSearchRes] = useState<RankingRowDTO[]>([]);

  useEffect(() => {
    if (!q.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearchRes(await searchRankingUsers(slug, q.trim()));
    }, 300);
    return () => clearTimeout(t);
  }, [q, slug]);

  const list = q.trim() ? searchRes : top;
  const criterio = criterioFromSlug(slug);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <PageHeader
        title="Rankings"
        description="Compare seu desempenho com estudantes de todo o Brasil."
        icon={Trophy}
      />

      {/* Seletor de ranking */}
      <Tabs value={slug} onValueChange={setSlug} className="mb-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-card p-1">
          {TAB_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {TAB_LABELS[s] ?? s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Card do usuário */}
      <AnimatePresence>
        {me && me.posicao != null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5"
          >
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Sua posição
                </div>
                <div className="text-4xl font-bold tracking-tight">#{me.posicao}</div>
              </div>
              {(() => {
                const f = formatValor(criterio, Number(me.valor));
                return <Stat label={f.unidade} value={f.valor} />;
              })()}
              <Stat label="Total de participantes" value={me.total.toLocaleString("pt-BR")} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pesquisa */}
      <Card className="mb-4 border-border/60">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usuário por nome ou @username..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Ranking ainda sem dados. Assim que houver atividade, ele será populado.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {list.map((r) => (
                <RankingRowItem key={`${r.user_id}-${r.posicao}`} r={r} criterio={criterio} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-lg font-bold tracking-tight", accent)}>{value}</div>
    </div>
  );
}

function RankingRowItem({ r, criterio }: { r: RankingRowDTO; criterio: string | undefined }) {
  const f = formatValor(criterio, Number(r.valor));
  const isTop3 = r.posicao <= 3;
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/30",
        isTop3 && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          isTop3
            ? `bg-gradient-to-br ${MEDALS[r.posicao - 1]} text-white shadow-md`
            : "bg-muted text-muted-foreground",
        )}
      >
        {isTop3 ? <Crown className="h-4 w-4" /> : r.posicao}
      </div>

      <Avatar className="h-9 w-9 ring-1 ring-border/60">
        {r.avatar_url && <AvatarImage src={r.avatar_url} />}
        <AvatarFallback className="bg-muted text-xs">
          {(r.nome ?? r.username ?? "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {r.username ? (
            <Link
              to="/perfil/$username"
              params={{ username: r.username }}
              className="truncate text-sm font-semibold hover:text-primary hover:underline"
            >
              {r.nome ?? `@${r.username}`}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold">{r.nome ?? "—"}</span>
          )}
          {r.nivel != null && (
            <RankBadge nivel={r.nivel} size="xs" xpTotal={Number(r.valor) || null} />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
          {r.liga && (
            <Badge variant="secondary" className="h-4 border-0 px-1.5 text-[9px] uppercase">
              {r.liga}
            </Badge>
          )}
          {r.nivel && <span>Nv. {r.nivel}</span>}
          {(r.cidade || r.estado) && (
            <span>· {[r.cidade, r.estado].filter(Boolean).join("/")}</span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-bold tabular-nums">{f.valor}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {f.unidade}
        </div>
      </div>
    </motion.li>
  );
}
