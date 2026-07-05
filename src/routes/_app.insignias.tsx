import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { InsigniaSVG, tierLabel, type Tier } from "@/components/recompensas/InsigniaSVG";
import { useConquistasV3 } from "@/hooks/useProgressao";

export const Route = createFileRoute("/_app/insignias")({
  head: () => ({
    meta: [
      { title: "Insígnias — FinSmart" },
      { name: "description", content: "Coleção de insígnias por raridade." },
    ],
  }),
  component: InsigniasPage,
});

const TIERS: Tier[] = ["bronze", "prata", "ouro", "platina", "diamante", "mestre", "lendario"];

function InsigniasPage() {
  const { data: conquistas = [] } = useConquistasV3();

  // Uma insígnia por tier = a conquista mais alta desbloqueada dessa raridade.
  const byTier: Record<Tier, boolean> = {
    bronze: false, prata: false, ouro: false, platina: false, diamante: false, mestre: false, lendario: false,
  };
  for (const c of conquistas) {
    if (c.desbloqueada && (c.raridade as Tier) in byTier) byTier[c.raridade as Tier] = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-rose-600 shadow-lg">
            <Award className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Insígnias</h1>
            <p className="text-sm text-muted-foreground">
              Sete medalhas exclusivas — desbloqueie conquistas de cada raridade.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {TIERS.map((t, i) => {
          const unlocked = byTier[t];
          return (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-black/50 to-slate-950/80 p-6 backdrop-blur-xl"
            >
              <InsigniaSVG tier={t} size={130} locked={!unlocked} />
              <div className="text-center">
                <h3 className="text-sm font-bold text-foreground">{tierLabel(t)}</h3>
                <p className="text-[11px] text-white/50">{unlocked ? "Desbloqueada" : "Bloqueada"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
