import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { admin } from "@/api";

export const Route = createFileRoute("/_app/admin/qre")({
  component: AdminQRE,
});

type Config = admin.QreConfigRow;

const DEFAULT: Config = {
  versao: "v1",
  pesos: { erros: 3, esquecimento: 2.5, edital: 2, dificuldade: 1.5, prioridade: 1.2, frequencia: 0.8, objetivo: 1.5, qualidade: 1, tempo_sem_revisao: 2 },
  distribuicao: { criticas: 40, novas: 30, reforco: 20, desafio: 10 },
  janela_repeticao_dias: 3,
  max_por_disciplina: 5,
  max_por_assunto: 3,
};

function AdminQRE() {
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  const [pesosText, setPesosText] = useState(JSON.stringify(DEFAULT.pesos, null, 2));
  const [distText, setDistText] = useState(JSON.stringify(DEFAULT.distribuicao, null, 2));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await admin.fetchQreConfig();
      if (c) {
        setCfg(c);
        setPesosText(JSON.stringify(c.pesos, null, 2));
        setDistText(JSON.stringify(c.distribuicao, null, 2));
      }
      setLoading(false);
    })();
  }, []);

  const salvar = async () => {
    let pesos: Record<string, number>, distribuicao: Record<string, number>;
    try { pesos = JSON.parse(pesosText); } catch { toast.error("JSON de pesos inválido"); return; }
    try { distribuicao = JSON.parse(distText); } catch { toast.error("JSON de distribuição inválido"); return; }
    const soma = Object.values(distribuicao).reduce((a, b) => a + Number(b || 0), 0);
    if (Math.round(soma) !== 100) { toast.error(`Distribuição deve somar 100 (soma=${soma})`); return; }
    try {
      await admin.setQreConfig({ ...cfg, pesos, distribuicao });
      toast.success("Configuração salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <PageHeader icon={Brain} title="Motor de Recomendação (QRE)" description="Pesos, distribuição e balanceamento do algoritmo" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4">
          <h3 className="text-sm font-semibold">Geral</h3>
          <label className="block text-xs text-muted-foreground">Versão do algoritmo</label>
          <Input value={cfg.versao} onChange={(e) => setCfg({ ...cfg, versao: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground">Janela repetição (dias)</label>
              <Input type="number" value={cfg.janela_repeticao_dias} onChange={(e) => setCfg({ ...cfg, janela_repeticao_dias: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">Máx / disciplina</label>
              <Input type="number" value={cfg.max_por_disciplina} onChange={(e) => setCfg({ ...cfg, max_por_disciplina: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">Máx / assunto</label>
              <Input type="number" value={cfg.max_por_assunto} onChange={(e) => setCfg({ ...cfg, max_por_assunto: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4">
          <h3 className="text-sm font-semibold">Distribuição (soma = 100)</h3>
          <Textarea rows={8} value={distText} onChange={(e) => setDistText(e.target.value)} className="font-mono text-xs" />
        </div>

        <div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">Pesos</h3>
          <Textarea rows={12} value={pesosText} onChange={(e) => setPesosText(e.target.value)} className="font-mono text-xs" />
        </div>
      </div>

      <Button onClick={() => void salvar()} className="gap-2"><Save className="h-4 w-4" /> Salvar configuração</Button>
    </div>
  );
}
