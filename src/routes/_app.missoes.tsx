import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMissions } from "@/api/hooks";
import { MissaoCard } from "@/components/recompensas/MissaoCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/missoes")({
  head: () => ({
    meta: [
      { title: "Missões — FinSmart" },
      { name: "description", content: "Complete missões diárias, semanais e mensais para ganhar XP." },
    ],
  }),
  component: MissoesPage,
});

const TABS = [
  { id: "diaria", label: "Diárias" },
  { id: "semanal", label: "Semanais" },
  { id: "mensal", label: "Mensais" },
] as const;

function MissoesPage() {
  const { data: rows = [], isLoading: loading, error, refetch: reload } = useMissions();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("diaria");

  const grupos = useMemo(() => {
    const g: Record<string, typeof rows> = { diaria: [], semanal: [], mensal: [] };
    for (const r of rows) if (r.periodo in g) g[r.periodo].push(r);
    return g;
  }, [rows]);

  const stats = useMemo(() => {
    const concluidas = rows.filter((r) => r.concluida).length;
    const resgatadas = rows.filter((r) => r.resgatada).length;
    const xpPendente = rows.filter((r) => r.concluida && !r.resgatada).reduce((s, r) => s + r.xp, 0);
    return { concluidas, resgatadas, xpPendente, total: rows.length };
  }, [rows]);

  const atual = grupos[tab] ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-fuchsia-500 shadow-lg">
            <Target className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Missões</h1>
            <p className="text-sm text-muted-foreground">
              Progresso calculado a partir do seu perfil em tempo real.
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Concluídas" value={stats.concluidas} accent="text-emerald-300" />
          <StatCard label="Resgatadas" value={stats.resgatadas} accent="text-sky-300" />
          <StatCard label="XP pendente" value={`+${stats.xpPendente}`} accent="text-amber-300" />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => {
          const count = grupos[t.id]?.length ?? 0;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              {t.label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Estados */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4" />
          Erro ao carregar missões.
          <button className="ml-auto underline" onClick={() => reload()}>Tentar novamente</button>
        </div>
      )}

      {!loading && !error && atual.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-white/40" />
          <p className="mt-3 text-sm text-white/60">Nenhuma missão {TABS.find((t) => t.id === tab)?.label.toLowerCase()} ativa.</p>
        </div>
      )}

      {!loading && atual.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {atual.map((m, i) => (
            <MissaoCard key={m.id} missao={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", accent ?? "text-foreground")}>{value}</div>
    </div>
  );
}
