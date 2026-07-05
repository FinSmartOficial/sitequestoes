import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Archive, Eye, ScanSearch, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { admin } from "@/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/qualidade")({
  head: () => ({ meta: [{ title: "Qualidade — Admin FinSmart Tec" }] }),
  component: AdminQualidadePage,
});

type Denuncia = admin.AdminDenuncia;
type Stats = admin.AdminQualityStats;

const STATUS_OPCOES = ["recebida", "em_analise", "aguardando_revisao", "corrigida", "rejeitada", "arquivada"];

function AdminQualidadePage() {
  const [rows, setRows] = useState<Denuncia[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<string>("recebida");
  const [prio, setPrio] = useState<string>("todas");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [detalhe, setDetalhe] = useState<Denuncia | null>(null);
  const [resolucao, setResolucao] = useState("");
  const [novoStatus, setNovoStatus] = useState<string>("em_analise");

  const carregar = useMemo(() => async () => {
    setLoading(true);
    const [list, st] = await Promise.all([
      admin.listDenuncias({
        status: status === "todas" ? null : status,
        prio: prio === "todas" ? null : prio,
        limit: 100,
        offset: 0,
      }),
      admin.fetchQualityStats(),
    ]);
    setRows(list);
    setStats(st);
    setLoading(false);
  }, [status, prio]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function scan() {
    setScanning(true);
    try {
      const n = await admin.scanQualidade();
      toast.success(`Scan concluído: ${n} questões com alertas.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setScanning(false);
    }
  }

  async function aplicarStatus() {
    if (!detalhe) return;
    if (novoStatus === detalhe.status && !resolucao) {
      toast.info("Nenhuma alteração para aplicar.");
      return;
    }
    try {
      await admin.atualizarStatusDenuncia({
        denunciaId: detalhe.id,
        novoStatus,
        resolucao: resolucao || null,
      });
    } catch (e) {
      console.error("qq_atualizar_status", e);
      return toast.error(e instanceof Error ? e.message : "Falha ao atualizar status");
    }
    toast.success(`Status alterado para "${novoStatus.replace(/_/g, " ")}"`);
    const destino = novoStatus;
    setDetalhe(null);
    setResolucao("");
    // Muda para a aba do novo status para o admin ver o item movido
    if (destino !== status && STATUS_OPCOES.includes(destino)) {
      setStatus(destino);
    } else {
      await carregar();
    }
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Quality Service"
        description="Denúncias, versionamento e controle de qualidade das questões."
        icon={ShieldCheck}
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Denúncias abertas" value={stats?.denuncias_abertas ?? 0} tone="warning" />
        <Kpi label="Corrigidas"        value={stats?.denuncias_corrigidas ?? 0} />
        <Kpi label="Tempo médio (h)"   value={stats?.tempo_medio_h ?? 0} />
        <Kpi label="Baixa qualidade"   value={stats?.baixa_qualidade ?? 0} hint="Score < 60" tone="warning" />
      </div>

      {/* Scan */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ScanSearch className="h-4 w-4 text-primary" /> Detecção automática de inconsistências
            </div>
            <p className="text-xs text-muted-foreground">
              Varre todo o banco procurando enunciados curtos, sem explicação, sem banca, etc.
            </p>
          </div>
          <Button size="sm" onClick={scan} disabled={scanning} className="gap-1.5">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Rodar scan
          </Button>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={status} onValueChange={setStatus} className="flex-1">
          <TabsList className="flex-wrap">
            <TabsTrigger value="recebida">Recebidas</TabsTrigger>
            <TabsTrigger value="em_analise">Em análise</TabsTrigger>
            <TabsTrigger value="aguardando_revisao">Aguard. revisão</TabsTrigger>
            <TabsTrigger value="corrigida">Corrigidas</TabsTrigger>
            <TabsTrigger value="rejeitada">Rejeitadas</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={prio} onValueChange={setPrio}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma denúncia encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PrioBadge prio={d.prioridade} />
                    <Badge variant="outline" className="text-[10px]">{d.tipo.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{d.materia}</Badge>
                    {d.banca && <Badge variant="outline" className="text-[10px]">{d.banca}</Badge>}
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      d.score >= 80 ? "border-emerald-500/40 text-emerald-500"
                      : d.score >= 60 ? "border-amber-500/40 text-amber-500"
                      : "border-rose-500/40 text-rose-500",
                    )}>Score {d.score}/100</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{d.enunciado}</p>
                  {d.descricao && <p className="text-xs italic text-muted-foreground">“{d.descricao}”</p>}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { setDetalhe(d); setNovoStatus(d.status); setResolucao(""); }}>
                    <Eye className="h-3.5 w-3.5" /> Analisar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Denúncia — {detalhe?.tipo.replace(/_/g, " ")}
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">{detalhe.enunciado}</div>
              {detalhe.descricao && (
                <div className="rounded-lg border border-dashed p-3 text-sm">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">Descrição do usuário</div>
                  {detalhe.descricao}
                </div>
              )}
              <div>
                <label className="text-xs font-medium">Novo status</label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPCOES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Resolução (opcional)</label>
                <Textarea rows={3} value={resolucao} onChange={(e) => setResolucao(e.target.value)}
                  placeholder="Descreva a análise ou correção aplicada…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetalhe(null)}>Cancelar</Button>
                <Button size="sm" onClick={aplicarStatus} className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Aplicar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warning" }) {
  return (
    <Card className={cn("border-border/60", tone === "warning" && "border-amber-500/40 bg-amber-500/5")}>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function PrioBadge({ prio }: { prio: "alta" | "media" | "baixa" }) {
  const map = {
    alta:  { c: "border-rose-500/40 bg-rose-500/10 text-rose-500",       l: "Alta"  },
    media: { c: "border-amber-500/40 bg-amber-500/10 text-amber-500",    l: "Média" },
    baixa: { c: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500", l: "Baixa" },
  }[prio];
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", map.c)}>
      <AlertTriangle className="h-3 w-3" /> {map.l}
    </Badge>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _archive = Archive; // reserved for future "arquivar" bulk action
