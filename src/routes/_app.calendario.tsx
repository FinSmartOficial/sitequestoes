import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendar } from "@/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — FinSmart Tec" },
      { name: "description", content: "Provas, simulados e prazos importantes." },
    ],
  }),
  component: CalendarioPage,
});

type TipoEvento = "Prova" | "Simulado" | "Prazo" | "Estudo";

import type { EventoAgenda as Evento } from "@/api/calendar";

const tipoColor: Record<TipoEvento, string> = {
  Prova: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Simulado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Prazo: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Estudo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const tipoDot: Record<TipoEvento, string> = {
  Prova: "bg-rose-400", Simulado: "bg-blue-400", Prazo: "bg-amber-400", Estudo: "bg-emerald-400",
};

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function diasAte(dataStr: string) {
  const d = new Date(dataStr + "T00:00:00");
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

function CalendarioPage() {
  const { rows: eventos, insert, remove } = useCalendar();
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("Prova");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() }; });

  async function adicionar() {
    if (!titulo || !data) { toast.error("Preencha título e data."); return; }
    const r = await insert({ titulo, data, tipo, observacao: null });
    if (r) { setTitulo(""); setData(""); toast.success("Evento adicionado"); }
  }

  const grade = useMemo(() => {
    const primeiro = new Date(cursor.ano, cursor.mes, 1);
    const offset = (primeiro.getDay() + 6) % 7;
    const totalDias = new Date(cursor.ano, cursor.mes + 1, 0).getDate();
    const cells: ({ iso: string; dia: number } | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= totalDias; d++) {
      const iso = `${cursor.ano}-${String(cursor.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ iso, dia: d });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [cursor]);

  const eventosPorDia = useMemo(() => {
    const m: Record<string, Evento[]> = {};
    eventos.forEach((e) => { (m[e.data] ||= []).push(e); });
    return m;
  }, [eventos]);

  const hojeISO = new Date().toISOString().slice(0, 10);

  function navega(delta: number) {
    let m = cursor.mes + delta, a = cursor.ano;
    if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; }
    setCursor({ ano: a, mes: m });
  }

  const proximos = eventos.filter((e) => diasAte(e.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader title="Calendário" description="Marque provas, simulados e prazos — contagem regressiva automática." icon={CalendarDays} />

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" /> Novo evento</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
            <div><Label className="text-xs">Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Prova PM-AL" /></div>
            <div><Label className="text-xs">Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEvento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prova">Prova</SelectItem>
                  <SelectItem value="Simulado">Simulado</SelectItem>
                  <SelectItem value="Prazo">Prazo</SelectItem>
                  <SelectItem value="Estudo">Estudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button onClick={adicionar} className="w-full md:w-auto">Adicionar</Button></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{MESES[cursor.mes]} {cursor.ano}</CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navega(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { const d = new Date(); setCursor({ ano: d.getFullYear(), mes: d.getMonth() }); }}>hoje</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navega(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grade.map((cell, i) => {
                if (!cell) return <div key={i} className="aspect-square rounded-md" />;
                const evs = eventosPorDia[cell.iso] || [];
                const isHoje = cell.iso === hojeISO;
                return (
                  <button
                    key={cell.iso}
                    onClick={() => setData(cell.iso)}
                    className={`group relative flex aspect-square flex-col rounded-md border p-1 text-left transition hover:border-primary/50 ${
                      isHoje ? "border-primary/60 bg-primary/10" : "border-border/40 bg-background/30"
                    } ${data === cell.iso ? "ring-2 ring-primary" : ""}`}
                  >
                    <span className={`text-xs font-medium ${isHoje ? "text-primary" : "text-foreground"}`}>{cell.dia}</span>
                    <div className="mt-auto flex flex-wrap gap-0.5">
                      {evs.slice(0, 3).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${tipoDot[e.tipo]}`} title={e.titulo} />)}
                      {evs.length > 3 && <span className="text-[9px] text-muted-foreground">+{evs.length - 3}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {(Object.keys(tipoDot) as TipoEvento[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${tipoDot[t]}`} />{t}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader><CardTitle className="text-base">Próximos eventos ({proximos.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {proximos.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum evento futuro.</p>
            ) : proximos.map((e, i) => {
              const dias = diasAte(e.data);
              return (
                <motion.div key={e.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${tipoColor[e.tipo]}`}>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{e.titulo}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{e.tipo}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${dias === 0 ? "text-primary" : dias <= 7 ? "text-rose-400" : "text-foreground"}`}>
                      {dias === 0 ? "hoje" : `${dias}d`}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
