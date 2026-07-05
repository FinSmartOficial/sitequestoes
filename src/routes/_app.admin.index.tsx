import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, FileQuestion, Target, Award, Swords, TrendingUp, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { admin } from "@/api";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

type Metrics = admin.AdminDashboardMetrics;
type QualityStats = { denuncias_abertas: number };

function AdminDashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [quality, setQuality] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [metrics, qs] = await Promise.all([
        admin.fetchDashboardMetrics(),
        admin.fetchQualityStats(),
      ]);
      setM(metrics);
      setQuality(qs ? { denuncias_abertas: qs.denuncias_abertas } : null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Usuários", value: m?.usuarios ?? 0, icon: Users, tint: "from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/30" },
    { label: "Novos hoje", value: m?.novos_hoje ?? 0, icon: TrendingUp, tint: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30" },
    { label: "Questões", value: m?.questoes ?? 0, icon: FileQuestion, tint: "from-violet-500/20 to-violet-500/5 text-violet-300 border-violet-500/30" },
    { label: "Denúncias abertas", value: quality?.denuncias_abertas ?? 0, icon: ShieldCheck, tint: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" },
    { label: "Arenas ativas", value: m?.arenas_ativas ?? 0, icon: Swords, tint: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-500/30" },
    { label: "Missões ativas", value: m?.missoes_ativas ?? 0, icon: Target, tint: "from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/30" },
    { label: "Insígnias", value: m?.insignias ?? 0, icon: Award, tint: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className={`border bg-gradient-to-br ${c.tint}`}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
                    {c.label}
                  </div>
                  <div className="mt-1 text-3xl font-bold text-foreground">
                    {c.value.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="rounded-xl bg-background/40 p-3">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
