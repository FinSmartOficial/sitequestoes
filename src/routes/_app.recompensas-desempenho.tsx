import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Target, CheckCircle2, XCircle, Clock, Flame, Star, Trophy, Award, Zap } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useDesempenho } from "@/api";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/recompensas-desempenho")({
  head: () => ({ meta: [{ title: "Desempenho — FinSmart" }] }),
  component: DesempenhoPage,
});

function DesempenhoPage() {
  const { data, isLoading } = useDesempenho();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg">
          <Activity className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Desempenho</h1>
          <p className="text-sm text-muted-foreground">Dados agregados do seu perfil.</p>
        </div>
      </motion.div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Card destaque com precisão */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-fuchsia-900/40 p-6 backdrop-blur-xl lg:col-span-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-white/60">Taxa de acerto</div>
              <div className="mt-2 h-48">
                <ResponsiveContainer>
                  <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ v: data.taxa, fill: "#fbbf24" }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="v" cornerRadius={20} background={{ fill: "rgba(255,255,255,0.05)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-amber-200 tabular-nums">{data.taxa}%</div>
                <div className="text-xs text-white/60">{data.acertos} acertos · {data.erros} erros</div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <Stat icon={Target} label="Questões" value={data.questoes} tone="from-sky-500/20 to-sky-900/40" />
              <Stat icon={CheckCircle2} label="Acertos" value={data.acertos} tone="from-emerald-500/20 to-emerald-900/40" />
              <Stat icon={XCircle} label="Erros" value={data.erros} tone="from-rose-500/20 to-rose-900/40" />
              <Stat icon={Clock} label="Minutos" value={data.minutos} tone="from-indigo-500/20 to-indigo-900/40" />
              <Stat icon={Flame} label="Sequência" value={`${data.streak}d`} tone="from-orange-500/20 to-red-900/40" />
              <Stat icon={Star} label="XP" value={data.xp_total} tone="from-amber-500/20 to-yellow-900/40" />
              <Stat icon={Zap} label="Nível" value={data.nivel} tone="from-fuchsia-500/20 to-purple-900/40" />
              <Stat icon={Trophy} label="Liga" value={data.liga} tone="from-cyan-500/20 to-teal-900/40" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Stat icon={Award} label="Missões concluídas" value={data.missoes_concluidas} big
              tone="from-amber-500/20 to-orange-900/40" />
            <Stat icon={Trophy} label="Conquistas desbloqueadas" value={data.conquistas_desbloqueadas} big
              tone="from-fuchsia-500/20 to-rose-900/40" />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone, big,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string; big?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} className={cn(
      "flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br p-4 backdrop-blur",
      tone, big && "p-6",
    )}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
        <div className={cn("font-black tabular-nums text-foreground", big ? "text-3xl" : "text-xl")}>{value}</div>
      </div>
    </motion.div>
  );
}
