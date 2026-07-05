import { createFileRoute } from "@tanstack/react-router";
import { History, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHistory } from "@/api";
import type { SessaoEstudo } from "@/api/history";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — FinSmart Tec" },
      { name: "description", content: "Registros diários de estudo e desempenho." },
    ],
  }),
  component: HistoricoPage,
});



function parseTempo(t: string): number {
  const m = t.match(/(\d+)h(\d*)/);
  if (m) return parseInt(m[1]) * 60 + (parseInt(m[2] || "0"));
  const c = t.match(/(\d+):(\d+)/);
  if (c) return parseInt(c[1]) * 60 + parseInt(c[2]);
  return parseInt(t) || 0;
}

function HistoricoPage() {
  const { rows, loading, insert, remove } = useHistory();
  const registros = rows;
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tempo, setTempo] = useState("");
  const [materia, setMateria] = useState("");
  const [questoes, setQuestoes] = useState("");
  const [acertos, setAcertos] = useState("");

  async function salvar() {
    const min = parseTempo(tempo);
    if (!min) { toast.error("Informe o tempo estudado."); return; }
    if (!materia) { toast.error("Informe a matéria."); return; }
    const r = await insert({
      data, minutos: min, materia,
      questoes_total: parseInt(questoes) || 0,
      questoes_acertos: parseInt(acertos) || 0,
      observacao: null,
    });
    if (r) {
      setTempo(""); setMateria(""); setQuestoes(""); setAcertos("");
      toast.success("Registro salvo");
    }
  }

  const totalMin = registros.reduce((s, r) => s + r.minutos, 0);
  const totalQ = registros.reduce((s, r) => s + (r.questoes_total || 0), 0);
  const totalA = registros.reduce((s, r) => s + (r.questoes_acertos || 0), 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader title="Histórico" description="Acompanhe seu progresso ao longo do tempo." icon={History} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tempo total</p><p className="mt-1 text-2xl font-semibold">{Math.floor(totalMin / 60)}h {totalMin % 60}min</p></CardContent></Card>
        <Card className="border-border/60 bg-card/80"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Questões feitas</p><p className="mt-1 text-2xl font-semibold">{totalQ}</p></CardContent></Card>
        <Card className="border-border/60 bg-card/80"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Acerto geral</p><p className="mt-1 text-2xl font-semibold">{totalQ ? Math.round((totalA / totalQ) * 100) : 0}%</p></CardContent></Card>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" /> Registrar dia</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div><Label className="text-xs">Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div><Label className="text-xs">Tempo (1h30, 90, 1:30)</Label><Input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="1h30" /></div>
            <div><Label className="text-xs">Matéria</Label><Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Português" /></div>
            <div><Label className="text-xs">Questões</Label><Input type="number" value={questoes} onChange={(e) => setQuestoes(e.target.value)} /></div>
            <div><Label className="text-xs">Acertos</Label><Input type="number" value={acertos} onChange={(e) => setAcertos(e.target.value)} /></div>
          </div>
          <Button onClick={salvar} className="mt-4">Salvar registro</Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="text-base">Registros ({registros.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : registros.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Tempo</TableHead><TableHead>Matéria</TableHead>
                  <TableHead className="text-right">Questões</TableHead><TableHead className="text-right">Acerto</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{Math.floor(r.minutos / 60)}h {r.minutos % 60}m</TableCell>
                    <TableCell className="text-muted-foreground">{r.materia || "—"}</TableCell>
                    <TableCell className="text-right">{r.questoes_total}</TableCell>
                    <TableCell className="text-right">
                      {r.questoes_total ? <Badge variant="secondary">{Math.round((r.questoes_acertos / r.questoes_total) * 100)}%</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
