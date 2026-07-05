import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Target, Power, PowerOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { admin } from "@/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/missoes")({
  component: AdminMissoes,
});

type Missao = admin.AdminMissao;

function AdminMissoes() {
  const [rows, setRows] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const data = await admin.listMissoes();
    setRows(data);
    setLoading(false);
  }

  async function toggle(m: Missao) {
    try {
      await admin.toggleMissaoAtiva(m.id, !m.ativa);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Falha");
    }
    await admin.logAdminAction(
      m.ativa ? "missao_desativar" : "missao_ativar",
      "missoes",
      m.id,
      { titulo: m.titulo },
    );
    toast.success("Missão atualizada");
    void load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card key={m.id} className="flex items-center gap-4 border-border/60 p-4">
          <Target className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">{m.tipo}</Badge>
              <span className="font-semibold">{m.titulo}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{m.descricao}</p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Meta: <b className="text-foreground">{m.meta}</b></span>
              <span>XP: <b className="text-amber-300">+{m.xp_recompensa}</b></span>
            </div>
          </div>
          <Button
            variant={m.ativa ? "default" : "outline"}
            size="sm"
            onClick={() => toggle(m)}
          >
            {m.ativa ? <><Power className="mr-1 h-3.5 w-3.5" /> Ativa</> : <><PowerOff className="mr-1 h-3.5 w-3.5" /> Inativa</>}
          </Button>
        </Card>
      ))}
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          Nenhuma missão cadastrada. Execute o SQL de missões primeiro.
        </div>
      )}
    </div>
  );
}
