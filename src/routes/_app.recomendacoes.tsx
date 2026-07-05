import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Brain, Save, Target, TrendingDown, TrendingUp, Sparkles, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanoInteligente } from "@/components/recomendacoes/PlanoInteligente";
import { usePlanoHoje, useRecoConfig } from "@/api";

export const Route = createFileRoute("/_app/recomendacoes")({
  head: () => ({
    meta: [
      { title: "Recomendações Inteligentes — FinSmart Tec" },
      { name: "description", content: "Treinador inteligente que analisa seu desempenho e recomenda exatamente o que estudar hoje." },
    ],
  }),
  component: RecomendacoesPage,
});

const DIAS = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" }, { v: 4, l: "Qui" },
  { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

function RecomendacoesPage() {
  const { plano } = usePlanoHoje();
  const { config, salvar } = useRecoConfig();

  const [tempo, setTempo] = useState<number>(60);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [concurso, setConcurso] = useState<string>("");
  const [prioridades, setPrioridades] = useState<string>("");

  useMemo(() => {
    if (config) {
      setTempo(config.tempo_diario_min);
      setDias(config.dias_semana);
      setConcurso(config.concurso ?? "");
      setPrioridades((config.disciplinas_prioritarias ?? []).join(", "));
    }
  }, [config]);

  const analise = plano?.analise;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Treinador Inteligente"
        description="Analisamos seu desempenho em tempo real e recomendamos exatamente o que você precisa estudar hoje."
        icon={Brain}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlanoInteligente />
        </div>

        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Mensagens para você
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analise?.mensagens?.length ? analise.mensagens.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-3 text-sm ${
                  m.tipo === "positivo"
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-100"
                }`}
              >
                {m.texto}
              </motion.div>
            )) : (
              <p className="text-sm text-muted-foreground">Continue estudando para receber recomendações personalizadas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analise" className="w-full">
        <TabsList>
          <TabsTrigger value="analise">Análise</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="analise" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-emerald-400"><TrendingUp className="h-4 w-4" /> Pontos Fortes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analise?.pontos_fortes?.length ? analise.pontos_fortes.map((p) => (
                  <div key={p.materia} className="flex items-center justify-between rounded-md border border-emerald-500/15 bg-emerald-500/5 p-2 text-sm">
                    <span className="truncate">{p.materia}</span>
                    <Badge variant="secondary">{p.precisao}%</Badge>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Estude mais para identificarmos suas forças.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-amber-400"><TrendingDown className="h-4 w-4" /> A Melhorar</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analise?.pontos_fracos?.length ? analise.pontos_fracos.map((p) => (
                  <div key={p.materia} className="flex items-center justify-between rounded-md border border-amber-500/15 bg-amber-500/5 p-2 text-sm">
                    <span className="truncate">{p.materia}</span>
                    <Badge variant="secondary">{p.precisao}%</Badge>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Nenhuma matéria abaixo do limiar. Ótimo trabalho!</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-sky-400"><Clock className="h-4 w-4" /> Esquecidos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analise?.esquecidos?.length ? analise.esquecidos.map((p) => (
                  <div key={p.materia} className="flex items-center justify-between rounded-md border border-sky-500/15 bg-sky-500/5 p-2 text-sm">
                    <span className="truncate">{p.materia}</span>
                    <Badge variant="secondary">{p.dias_sem_revisar}d</Badge>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Suas revisões estão em dia.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Configuração do Treinador</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tempo diário disponível: <b>{tempo} min</b></Label>
                <Slider min={15} max={300} step={5} value={[tempo]} onValueChange={(v) => setTempo(v[0])} />
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((d) => {
                    const on = dias.includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => setDias((prev) => on ? prev.filter((x) => x !== d.v) : [...prev, d.v])}
                        className={`rounded-md border px-3 py-1.5 text-sm transition ${
                          on ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Concurso objetivo</Label>
                  <Input value={concurso} onChange={(e) => setConcurso(e.target.value)} placeholder="Ex: PMAL 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Disciplinas prioritárias (separadas por vírgula)</Label>
                  <Input value={prioridades} onChange={(e) => setPrioridades(e.target.value)} placeholder="Direito Constitucional, Português" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => salvar({
                  tempo_diario_min: tempo,
                  dias_semana: dias,
                  concurso: concurso || null,
                  disciplinas_prioritarias: prioridades.split(",").map((s) => s.trim()).filter(Boolean),
                })}>
                  <Save className="mr-2 h-4 w-4" /> Salvar preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
