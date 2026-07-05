import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileBadge, Plus, Trash2, Archive, Save, Copy, ListTree, ImagePlus, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEditaisAdmin, useExamDisciplines } from "@/api";
import {
  upsertExam, deleteExam, duplicateExam, toggleArchiveExam,
  uploadExamCover, addExamDiscipline, removeExamDiscipline,
  type ExamDTO as Edital,
} from "@/api/exams";

export const Route = createFileRoute("/_app/admin/editais")({
  head: () => ({ meta: [{ title: "Admin · Editais — FinSmart Tec" }] }),
  component: AdminEditaisPage,
});

const EMPTY: Partial<Edital> = {
  nome: "", orgao: "", cargo: "", banca: "", ano: new Date().getFullYear(),
  estado: "", cidade: "", area: "", escolaridade: "", vagas: 0,
  cadastro_reserva: false, situacao: "previsto", status: "ativo",
  data_prova: null, link_oficial: "", descricao: "",
  nivel: "", tipo_prova: "", etapas: "", local_prova: "", observacoes: "",
  capa_url: "",
};

const NIVEIS = ["Fundamental", "Médio", "Médio/Técnico", "Superior", "Pós-graduação"];
const TIPOS_PROVA = ["Objetiva", "Objetiva + Discursiva", "Objetiva + Redação", "Discursiva", "Prática", "Títulos"];

function AdminEditaisPage() {
  const { editais, loading, reload } = useEditaisAdmin();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Edital>>(EMPTY);
  const [managingId, setManagingId] = useState<string | null>(null);

  const salvar = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    try {
      await upsertExam(form);
      toast.success("Edital salvo");
      setOpen(false);
      setForm(EMPTY);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este edital?")) return;
    try {
      await deleteExam(id);
      toast.success("Excluído");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const duplicar = async (e: Edital) => {
    try {
      await duplicateExam(e);
      toast.success("Duplicado");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const arquivar = async (e: Edital) => {
    try {
      await toggleArchiveExam(e);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileBadge className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Editais</h2>
            <p className="text-xs text-muted-foreground">
              Cadastre, edite e gerencie os concursos disponíveis na plataforma.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(EMPTY)}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo edital
            </Button>
          </DialogTrigger>
          <EditalForm form={form} setForm={setForm} onSave={salvar} />
        </Dialog>
      </div>

      <div className="grid gap-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && editais.length === 0 && (
          <Card className="border-dashed border-border/60">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum edital cadastrado.
            </CardContent>
          </Card>
        )}
        {editais.map((e) => (
          <motion.div key={e.id} layout>
            <Card className="border-border/60">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                {e.capa_url ? (
                  <img src={e.capa_url} alt={e.nome} className="h-14 w-14 rounded-lg object-cover border border-border/60" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground">
                    <FileBadge className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{e.nome}</span>
                    <Badge variant="secondary" className="border-0 text-[10px] uppercase tracking-wide">
                      {e.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[e.orgao, e.cargo, e.banca, e.ano].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setManagingId(managingId === e.id ? null : e.id)}>
                    <ListTree className="mr-1 h-4 w-4" /> Disciplinas
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setForm(e); setOpen(true); }}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicar(e)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => arquivar(e)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {managingId === e.id && <DisciplinasManager editalId={e.id} />}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EditalForm({
  form, setForm, onSave,
}: {
  form: Partial<Edital>;
  setForm: (v: Partial<Edital>) => void;
  onSave: () => void;
}) {
  const set = <K extends keyof Edital>(k: K, v: Edital[K] | null) =>
    setForm({ ...form, [k]: v });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadCapa = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem acima de 5MB");
    setUploading(true);
    try {
      const url = await uploadExamCover(file);
      set("capa_url", url);
      toast.success("Capa enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{form.id ? "Editar" : "Novo"} edital</DialogTitle>
      </DialogHeader>

      {/* Capa */}
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          {form.capa_url ? (
            <>
              <img src={form.capa_url} alt="Capa" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => set("capa_url", null)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive hover:bg-background"
                aria-label="Remover capa"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Capa / imagem do edital</Label>
          <div className="mt-1 flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              {form.capa_url ? "Trocar imagem" : "Enviar imagem"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCapa(f); e.target.value = ""; }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG ou JPG, até 5MB. Aparece na listagem de editais.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome *" className="md:col-span-2"><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} /></Field>
        <Field label="Órgão"><Input value={form.orgao ?? ""} onChange={(e) => set("orgao", e.target.value)} /></Field>
        <Field label="Cargo"><Input value={form.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></Field>
        <Field label="Banca"><Input value={form.banca ?? ""} onChange={(e) => set("banca", e.target.value)} /></Field>
        <Field label="Ano"><Input type="number" value={form.ano ?? ""} onChange={(e) => set("ano", Number(e.target.value) || null)} /></Field>
        <Field label="Estado"><Input value={form.estado ?? ""} onChange={(e) => set("estado", e.target.value)} /></Field>
        <Field label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></Field>
        <Field label="Área"><Input value={form.area ?? ""} onChange={(e) => set("area", e.target.value)} /></Field>
        <Field label="Escolaridade"><Input value={form.escolaridade ?? ""} onChange={(e) => set("escolaridade", e.target.value)} /></Field>
        <Field label="Nível">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.nivel ?? ""}
            onChange={(e) => set("nivel", e.target.value || null)}
          >
            <option value="">—</option>
            {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Tipo de prova">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.tipo_prova ?? ""}
            onChange={(e) => set("tipo_prova", e.target.value || null)}
          >
            <option value="">—</option>
            {TIPOS_PROVA.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Remuneração"><Input type="number" value={form.remuneracao ?? ""} onChange={(e) => set("remuneracao", Number(e.target.value) || null)} /></Field>
        <Field label="Carga horária"><Input value={form.carga_horaria ?? ""} onChange={(e) => set("carga_horaria", e.target.value)} placeholder="Ex.: 40h semanais" /></Field>
        <Field label="Vagas"><Input type="number" value={form.vagas ?? 0} onChange={(e) => set("vagas", Number(e.target.value) || 0)} /></Field>
        <Field label="Valor da inscrição"><Input type="number" value={form.valor_inscricao ?? ""} onChange={(e) => set("valor_inscricao", Number(e.target.value) || null)} /></Field>
        <Field label="Etapas" className="md:col-span-2">
          <Input value={form.etapas ?? ""} onChange={(e) => set("etapas", e.target.value)} placeholder="Ex.: Prova objetiva, discursiva e títulos" />
        </Field>
        <Field label="Situação">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.situacao ?? "previsto"}
            onChange={(e) => set("situacao", e.target.value)}
          >
            <option value="previsto">Previsto</option>
            <option value="publicado">Publicado</option>
            <option value="inscricoes">Inscrições abertas</option>
            <option value="prova">Prova marcada</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </Field>
        <Field label="Cadastro reserva">
          <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <Checkbox
              checked={!!form.cadastro_reserva}
              onCheckedChange={(v) => set("cadastro_reserva", v === true)}
            />
            <span className="text-muted-foreground">Prevê cadastro reserva</span>
          </label>
        </Field>
        <Field label="Data de publicação"><Input type="date" value={form.data_publicacao ?? ""} onChange={(e) => set("data_publicacao", e.target.value || null)} /></Field>
        <Field label="Data da prova"><Input type="date" value={form.data_prova ?? ""} onChange={(e) => set("data_prova", e.target.value || null)} /></Field>
        <Field label="Início das inscrições"><Input type="date" value={form.inscricoes_inicio ?? ""} onChange={(e) => set("inscricoes_inicio", e.target.value || null)} /></Field>
        <Field label="Fim das inscrições"><Input type="date" value={form.inscricoes_fim ?? ""} onChange={(e) => set("inscricoes_fim", e.target.value || null)} /></Field>
        <Field label="Local da prova" className="md:col-span-2">
          <Input value={form.local_prova ?? ""} onChange={(e) => set("local_prova", e.target.value)} placeholder="Cidades/estados de aplicação" />
        </Field>
        <Field label="Link oficial" className="md:col-span-2"><Input value={form.link_oficial ?? ""} onChange={(e) => set("link_oficial", e.target.value)} placeholder="https://..." /></Field>
        <Field label="Descrição" className="md:col-span-2">
          <Textarea rows={3} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <Field label="Observações" className="md:col-span-2">
          <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} placeholder="Requisitos extras, benefícios, prazos internos…" />
        </Field>
      </div>
      <DialogFooter>
        <Button onClick={onSave}><Save className="mr-1.5 h-4 w-4" /> Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function DisciplinasManager({ editalId }: { editalId: string }) {
  const { list, reload } = useExamDisciplines(editalId);
  const [nome, setNome] = useState("");
  const [peso, setPeso] = useState(1);
  const [qtd, setQtd] = useState(10);

  const add = async () => {
    if (!nome.trim()) return;
    try {
      await addExamDiscipline({
        edital_id: editalId,
        nome: nome.trim(),
        peso,
        qtd_questoes: qtd,
        ordem: list.length,
      });
      setNome(""); setPeso(1); setQtd(10);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (id: string) => {
    try {
      await removeExamDiscipline(id);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/40 p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]">
        <Input placeholder="Disciplina" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input type="number" placeholder="Peso" value={peso} onChange={(e) => setPeso(Number(e.target.value) || 1)} />
        <Input type="number" placeholder="Questões" value={qtd} onChange={(e) => setQtd(Number(e.target.value) || 0)} />
        <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      <ul className="space-y-1.5">
        {list.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
            <span>{d.nome} <span className="text-xs text-muted-foreground">· peso {d.peso} · {d.qtd_questoes}q</span></span>
            <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </li>
        ))}
        {list.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma disciplina cadastrada.</li>}
      </ul>
    </div>
  );
}
