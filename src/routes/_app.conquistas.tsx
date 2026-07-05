import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, AlertTriangle } from "lucide-react";
import { useAchievements } from "@/api/hooks";
import { ConquistaCardV3 } from "@/components/recompensas/ConquistaCardV3";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — FinSmart" },
      { name: "description", content: "Suas conquistas permanentes." },
    ],
  }),
  component: ConquistasPage,
});

function ConquistasPage() {
  const { data: conquistas = [], isLoading, error, refetch } = useAchievements();
  const desbloq = conquistas.filter((c) => c.desbloqueada).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-600 shadow-lg">
            <Trophy className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Conquistas</h1>
            <p className="text-sm text-muted-foreground">
              {desbloq} de {conquistas.length} desbloqueadas — permanentes, jamais resetam.
            </p>
          </div>
        </div>
      </motion.div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4" /> Erro ao carregar.
          <button className="ml-auto underline" onClick={() => refetch()}>Tentar novamente</button>
        </div>
      )}
      {!isLoading && conquistas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/60">
          Nenhuma conquista disponível.
        </div>
      )}
      {!isLoading && conquistas.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {conquistas.map((c, i) => <ConquistaCardV3 key={c.id} conquista={c} index={i} />)}
        </div>
      )}
    </div>
  );
}
