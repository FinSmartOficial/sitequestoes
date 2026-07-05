import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, RefreshCw, Zap, Plus, Trash2, Save, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { admin } from "@/api";
import { toast } from "sonner";
import {
  recomputeAllRankings, recomputeRanking, type RankingDef,
} from "@/hooks/useRankings";

export const Route = createFileRoute("/_app/admin/rankings")({
  head: () => ({ meta: [{ title: "Admin · Rankings — FinSmart Tec" }] }),
  component: AdminRankingsPage,
});

const CRITERIOS = ["xp", "lp", "nivel", "vitorias", "precisao", "questoes", "tempo", "streak"];
const ESCOPOS = ["global", "nacional", "estado", "cidade", "concurso", "cargo", "disciplina", "arena", "liga", "temporada", "semanal", "mensal", "anual", "amigos"];

function AdminRankingsPage() {
  const [list, setList] = useState<RankingDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "", nome: "", criterio: "xp", escopo: "global",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await admin.listRankingDefs();
    setList(data as unknown as RankingDef[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const criar = async () => {
    if (!form.slug || !form.nome) return toast.error("Slug e nome são obrigatórios");
    try {
      await admin.createRankingDef(form);
      toast.success("Ranking criado");
      setForm({ slug: "", nome: "", criterio: "xp", escopo: "global" });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const toggle = async (r: RankingDef) => {
    await admin.toggleRankingDef(r.id, !r.ativo);
    await load();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir ranking?")) return;
    await admin.deleteRankingDef(id);
    await load();
  };

  const recomputar = async (id: string) => {
    setBusy(id);
    const { data, error } = await recomputeRanking(id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Recomputado: ${data ?? 0} linhas`);
  };

  const recomputarTudo = async () => {
    setBusy("all");
    const { data, error } = await recomputeAllRankings();
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Total processado: ${data ?? 0}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Rankings</h2>
            <p className="text-xs text-muted-foreground">
              Configure critérios, escopos e recompute snapshots.
            </p>
          </div>
        </div>
        <Button onClick={recomputarTudo} disabled={busy === "all"}>
          <Zap className={`mr-1.5 h-4 w-4 ${busy === "all" ? "animate-pulse" : ""}`} />
          Recomputar todos
        </Button>
      </div>

      {/* Novo ranking */}
      <Card className="border-border/60">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div>
            <Label className="text-xs">Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="global_xp" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ranking Global de XP" />
          </div>
          <div>
            <Label className="text-xs">Critério</Label>
            <Select value={form.criterio} onValueChange={(v) => setForm({ ...form, criterio: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRITERIOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Escopo</Label>
            <Select value={form.escopo} onValueChange={(v) => setForm({ ...form, escopo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESCOPOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5">
            <Button size="sm" onClick={criar}><Plus className="mr-1.5 h-4 w-4" /> Criar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="grid gap-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {list.map((r) => (
          <motion.div key={r.id} layout>
            <Card className="border-border/60">
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.nome}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">{r.slug}</Badge>
                    {!r.ativo && <Badge variant="destructive" className="text-[10px]">inativo</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Critério: {r.criterio} · Escopo: {r.escopo}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => recomputar(r.id)} disabled={busy === r.id}>
                  <RefreshCw className={`mr-1 h-4 w-4 ${busy === r.id ? "animate-spin" : ""}`} /> Recomputar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(r)}>
                  <Power className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
