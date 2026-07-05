import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { admin } from "@/api";

export const Route = createFileRoute("/_app/admin/conquistas")({
  component: AdminConquistas,
});

type Row = admin.AdminConquista;

const empty: Row = {
  id: "",
  codigo: "",
  nome: "",
  descricao: "",
  categoria: "especial",
  raridade: "comum",
  xp_recompensa: 0,
  ativa: true,
  oculta: false,
  criterio: { tipo: "questoes_respondidas", valor: 100 },
};

function AdminConquistas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await admin.listConquistas();
    setRows(data);
  };
  useEffect(() => { void load(); }, []);

  const salvar = async () => {
    if (!form.codigo || !form.nome) { toast.error("Código e nome obrigatórios"); return; }
    setSaving(true);
    try {
      await admin.upsertConquista(form);
      toast.success("Conquista salva");
      setForm(empty);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir conquista?")) return;
    try {
      await admin.deleteConquista(id);
      toast.success("Excluída");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Award} title="Conquistas (Admin)" description="Criar, editar e desativar conquistas do sistema" />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4">
          <h3 className="text-sm font-semibold">Nova / Editar</h3>
          <Input placeholder="Código único (ex: q_100)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {["arena","simulados","questoes","tempo","ranking","liga","missoes","eventos","revisao","social","perfil","especial"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.raridade} onChange={(e) => setForm({ ...form, raridade: e.target.value })}>
              {["comum","incomum","rara","epica","lendaria","mitica"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.criterio.tipo} onChange={(e) => setForm({ ...form, criterio: { ...form.criterio, tipo: e.target.value } })}>
              {["questoes_respondidas","questoes_corretas","arena_vitorias","arena_partidas","simulados_finalizados","dias_estudo","missoes_concluidas","revisoes_concluidas"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <Input type="number" placeholder="valor" value={form.criterio.valor ?? 0} onChange={(e) => setForm({ ...form, criterio: { ...form.criterio, valor: Number(e.target.value) } })} />
          </div>
          <Input type="number" placeholder="XP recompensa" value={form.xp_recompensa} onChange={(e) => setForm({ ...form, xp_recompensa: Number(e.target.value) })} />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.ativa} onChange={(e) => setForm({ ...form, ativa: e.target.checked })} /> Ativa</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.oculta} onChange={(e) => setForm({ ...form, oculta: e.target.checked })} /> Oculta</label>
          </div>
          <Button onClick={() => void salvar()} disabled={saving} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Salvar
          </Button>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/95 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Código</th><th className="p-3">Nome</th><th className="p-3">Cat.</th><th className="p-3">Rar.</th><th className="p-3">Critério</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs">{r.codigo}</td>
                    <td className="p-3">{r.nome}</td>
                    <td className="p-3 capitalize">{r.categoria}</td>
                    <td className="p-3 capitalize">{r.raridade}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.criterio?.tipo} ≥ {r.criterio?.valor}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setForm(r)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => void excluir(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma conquista ainda</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
