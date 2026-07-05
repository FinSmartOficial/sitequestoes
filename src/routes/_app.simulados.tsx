import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Play, Trophy, Clock, Target, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useSimulacoesHistorico,
  useSimulacaoMaterias,
  useSimulacaoBancas,
  useCriarSimulacao,
} from "@/api";
import { formatarTempo, type SimulationFilters } from "@/api/simulations";

export const Route = createFileRoute("/_app/simulados")({
  head: () => ({
    meta: [
      { title: "Simulados — FinSmart Tec" },
      { name: "description", content: "Sistema profissional de simulados com correção server-authoritative, cronômetro persistente e integração com revisão inteligente." },
    ],
  }),
  component: SimuladosPage,
});

const TIPOS = [
  { id: "livre", label: "Livre" },
  { id: "personalizado", label: "Personalizado" },
  { id: "concurso", label: "Por Concurso" },
  { id: "banca", label: "Por Banca" },
  { id: "disciplina", label: "Por Disciplina" },
  { id: "inteligente", label: "Inteligente (recomendações)" },
  { id: "erradas", label: "Somente questões erradas" },
  { id: "ineditas", label: "Somente questões inéditas" },
];

function SimuladosPage() {
  const { data: historico = [], isLoading: carregando } = useSimulacoesHistorico(50);
  const { data: materias = [] } = useSimulacaoMaterias();
  const { data: bancas = [] } = useSimulacaoBancas();

  const emAndamento = historico.find(h => h.status === "em_andamento");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Simulados"
        description="Prova completa em ambiente controlado — correção e cronômetro server-authoritative."
        icon={ClipboardList}
        action={<NovoSimuladoDialog materias={materias} bancas={bancas} />}
      />

      {emAndamento && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{emAndamento.titulo}</p>
                  <p className="text-xs text-muted-foreground">Simulado em andamento — continue de onde parou.</p>
                </div>
              </div>
              <Button asChild><Link to="/simulados/$id" params={{ id: emAndamento.id }}><Play className="mr-2 h-4 w-4" /> Continuar</Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Histórico</h2>
        {carregando ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : historico.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum simulado ainda. Crie o primeiro.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historico.map(h => (
              <Link key={h.id} to={h.status === "finalizado" ? "/simulados/$id/relatorio" : "/simulados/$id"} params={{ id: h.id }}>
                <Card className="h-full border-border/60 bg-card/80 transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{h.titulo}</CardTitle>
                      <Badge variant={h.status === "finalizado" ? "default" : h.status === "em_andamento" ? "outline" : "secondary"}>
                        {h.status === "em_andamento" ? "Em curso" : h.status === "finalizado" ? "Concluído" : "Cancelado"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{h.qtd}q</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{h.tempo_minutos}min</span>
                    </div>
                    {h.resultado && h.status === "finalizado" && (
                      <div className="flex items-center gap-1 text-primary">
                        <Trophy className="h-3.5 w-3.5" />
                        {h.resultado.acertos ?? 0}/{h.resultado.total ?? h.qtd} · {h.resultado.precisao ?? 0}%
                      </div>
                    )}
                    <p className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NovoSimuladoDialog({ materias, bancas }: { materias: string[]; bancas: string[] }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("livre");
  const [titulo, setTitulo] = useState("");
  const [qtd, setQtd] = useState(20);
  const [tempo, setTempo] = useState(30);
  const [materia, setMateria] = useState<string>("");
  const [banca, setBanca] = useState<string>("");
  const [tipoQ, setTipoQ] = useState<string>("");
  const [apenasErradas, setApenasErradas] = useState(false);
  const [apenasIneditas, setApenasIneditas] = useState(false);
  const criar = useCriarSimulacao();

  async function submeter() {
    const filtros: SimulationFilters = {};
    if (materia) filtros.materias = [materia];
    if (banca) filtros.bancas = [banca];
    if (tipoQ) filtros.tipo = tipoQ as "CE" | "MULTIPLA";
    if (tipo === "erradas" || apenasErradas) filtros.apenas_erradas = true;
    if (tipo === "ineditas" || apenasIneditas) filtros.apenas_ineditas = true;

    try {
      const id = await criar.mutateAsync({
        tipo,
        titulo: titulo.trim() || `Simulado ${TIPOS.find(t=>t.id===tipo)?.label ?? ""}`,
        filtros, qtd, tempo_minutos: tempo,
      });
      toast.success("Simulado criado — tempo total: " + formatarTempo(tempo*60));
      setOpen(false);
      nav({ to: "/simulados/$id", params: { id } });
    } catch (e: unknown) {
      const msg =
        (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : null) ?? "Falha ao criar simulado";
      console.error("[simulado_criar] erro:", e);
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo simulado</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Criar simulado</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Título (opcional)</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Revisão PM-AL Direito Constitucional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Questões</Label>
              <Input type="number" min={1} max={300} value={qtd} onChange={e => setQtd(Math.max(1, Math.min(300, Number(e.target.value)||0)))} />
            </div>
            <div className="grid gap-2">
              <Label>Tempo (min)</Label>
              <Input type="number" min={1} max={600} value={tempo} onChange={e => setTempo(Math.max(1, Math.min(600, Number(e.target.value)||0)))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Disciplina</Label>
              <Select value={materia || "__all"} onValueChange={v => setMateria(v === "__all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {materias.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Banca</Label>
              <Select value={banca || "__all"} onValueChange={v => setBanca(v === "__all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {bancas.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tipo de questão</Label>
            <Select value={tipoQ || "__all"} onValueChange={v => setTipoQ(v === "__all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="CE">Certo / Errado</SelectItem>
                <SelectItem value="MULTIPLA">Múltipla escolha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div><p className="text-sm font-medium">Somente questões erradas</p><p className="text-xs text-muted-foreground">Refaça o que você errou.</p></div>
            <Switch checked={apenasErradas} onCheckedChange={setApenasErradas} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div><p className="text-sm font-medium">Somente questões inéditas</p><p className="text-xs text-muted-foreground">Sem repetir o que já respondeu.</p></div>
            <Switch checked={apenasIneditas} onCheckedChange={setApenasIneditas} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submeter} disabled={criar.isPending}>
            {criar.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : "Criar e iniciar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
