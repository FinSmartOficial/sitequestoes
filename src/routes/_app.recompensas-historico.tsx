import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { History, Trophy, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRewardHistory } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/recompensas-historico")({
  head: () => ({ meta: [{ title: "Histórico de Recompensas — FinSmart" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { data: itens = [], isLoading } = useRewardHistory(100);

  // agrupar por dia
  const grupos: Record<string, typeof itens> = {};
  for (const it of itens) {
    const dia = new Date(it.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    (grupos[dia] ??= []).push(it);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 shadow-lg">
          <History className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground">Todas as recompensas resgatadas.</p>
        </div>
      </motion.div>

      {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mb-3 h-16 rounded-xl" />)}

      {!isLoading && itens.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/60">
          Nenhuma recompensa ainda. Complete missões para preencher seu histórico.
        </div>
      )}

      {Object.entries(grupos).map(([dia, lista]) => (
        <div key={dia} className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">{dia}</h2>
          <div className="space-y-2">
            {lista.map((it, i) => {
              const Icon = it.tipo === "missao" ? Sparkles : Trophy;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    it.tipo === "missao" ? "bg-amber-500/20 text-amber-200" : "bg-fuchsia-500/20 text-fuchsia-200",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{it.titulo}</div>
                    <div className="truncate text-xs text-white/50">
                      {formatDistanceToNow(new Date(it.criado_em), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-300">+{it.xp} XP</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{it.tipo}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
