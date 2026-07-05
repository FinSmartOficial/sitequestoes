import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  RefreshCcw,
  Play,
  Pause,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Star,
  ArrowRight,
  Timer,
  Target,
  BookOpen,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStudyCycle, useReviewQueue } from "@/api";
import {
  type DisciplineDraft,
  type StudyCycle,
  type StudyCycleDiscipline,
  type StudyCycleStats,
} from "@/api/studyCycle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ciclo")({
  head: () => ({
    meta: [
      { title: "Ciclo de Estudos — FinSmart Tec" },
      {
        name: "description",
        content:
          "Ciclo contínuo e inteligente de estudos: nunca pare no meio, continue exatamente de onde parou.",
      },
    ],
  }),
  component: CicloPage,
});

const DISCIPLINAS_SUGERIDAS = [
  "Português",
  "Direito Constitucional",
  "Direito Administrativo",
  "Direito Civil",
  "Direito Penal",
  "Informática",
  "Raciocínio Lógico",
  "Matemática",
  "Administração Pública",
  "Contabilidade",
  "Legislação Específica",
  "Atualidades",
  "Inglês",
  "Redação",
];

function CicloPage() {
  const {
    loading,
    cycles,
    disciplines,
    progress,
    createCycle,
    removeCycle,
    setDefault,
    advance,
    startSession,
    registerSession,
    updateCycle,
    duplicateCycle,
    stats,
  } = useStudyCycle();
  const [openNew, setOpenNew] = useState(false);
  const [editingCycle, setEditingCycle] = useState<StudyCycle | null>(null);

  const cicloPrincipal = useMemo(() => cycles.find((c) => c.is_default) ?? cycles[0], [cycles]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={RefreshCcw}
        title="Ciclo de Estudos"
        description="Sequência contínua e inteligente. Sem calendário, sem dias fixos — o sistema continua exatamente de onde você parou."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo ciclo
              </Button>
            </DialogTrigger>
            <CicloFormDialog
              mode="create"
              onClose={() => setOpenNew(false)}
              onSubmit={async (payload) => {
                await createCycle(payload);
                setOpenNew(false);
              }}
            />
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : cycles.length === 0 ? (
        <EmptyState onCreate={() => setOpenNew(true)} />
      ) : (
        <>
          {cicloPrincipal && (
            <CicloAtivo
              cycle={cicloPrincipal}
              discs={disciplines[cicloPrincipal.id] ?? []}
              prog={progress[cicloPrincipal.id]}
              stats={stats[cicloPrincipal.id]}
              onAdvance={() => advance(cicloPrincipal.id)}
              onStartSession={startSession}
              onRegisterSession={registerSession}
            />
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Meus ciclos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cycles.map((c) => (
                <CicloCard
                  key={c.id}
                  cycle={c}
                  discs={disciplines[c.id] ?? []}
                  prog={progress[c.id]}
                  onSetDefault={() => setDefault(c.id)}
                  onEdit={() => setEditingCycle(c)}
                  onDuplicate={() => duplicateCycle(c.id)}
                  onRemove={() => {
                    if (confirm(`Excluir ciclo "${c.name}"?`)) removeCycle(c.id);
                  }}
                />
              ))}
            </div>
          </section>

          <Dialog open={!!editingCycle} onOpenChange={(open) => !open && setEditingCycle(null)}>
            {editingCycle && (
              <CicloFormDialog
                key={editingCycle.id}
                mode="edit"
                initialCycle={editingCycle}
                initialDisciplines={disciplines[editingCycle.id] ?? []}
                onClose={() => setEditingCycle(null)}
                onSubmit={async (payload) => {
                  await updateCycle(editingCycle.id, payload);
                  setEditingCycle(null);
                }}
              />
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-indigo-500/10 p-4 text-indigo-400">
          <RefreshCcw className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Comece seu primeiro ciclo</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Defina a sequência de disciplinas e o sistema alternará automaticamente. Ao pausar,
            retomamos exatamente de onde você parou.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Criar ciclo
        </Button>
      </CardContent>
    </Card>
  );
}

function CicloAtivo({
  cycle,
  discs,
  prog,
  stats,
  onAdvance,
  onStartSession,
  onRegisterSession,
}: {
  cycle: StudyCycle;
  discs: ReturnType<typeof useStudyCycle>["disciplines"][string];
  prog: ReturnType<typeof useStudyCycle>["progress"][string] | undefined;
  stats: StudyCycleStats | undefined;
  onAdvance: () => void;
  onStartSession: ReturnType<typeof useStudyCycle>["startSession"];
  onRegisterSession: ReturnType<typeof useStudyCycle>["registerSession"];
}) {
  const navigate = useNavigate();
  const ativas = discs.filter((d) => d.enabled);
  const pos = prog?.current_position ?? 0;
  const atual = ativas[pos] ?? ativas[0];
  const { data: revisoesPendentes } = useReviewQueue(80);
  // Nota: `review_today_queue` não retorna disciplina; contagem geral apenas.
  const revisoesDaDisciplina = useMemo(
    () => (atual ? (revisoesPendentes?.items.length ?? 0) : 0),
    [atual, revisoesPendentes],
  );
  const pct = ativas.length ? Math.round((pos / ativas.length) * 100) : 0;
  const storageKey = atual ? `finsmart:study-cycle:${cycle.id}:${atual.id}` : null;
  const [activeSince, setActiveSince] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startingStudy, setStartingStudy] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setActiveSince(null);
      setElapsedSeconds(0);
      return;
    }

    const serverStartedAt =
      prog?.current_discipline_id === atual?.id ? prog?.current_session_started_at : null;
    if (serverStartedAt) {
      const fromServer = Date.parse(serverStartedAt);
      if (Number.isFinite(fromServer) && fromServer > 0) {
        window.localStorage.setItem(storageKey, String(fromServer));
        setActiveSince(fromServer);
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - fromServer) / 1000)));
        return;
      }
    }

    const saved = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved > 0) {
      setActiveSince(saved);
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - saved) / 1000)));
    } else {
      setActiveSince(null);
      setElapsedSeconds(0);
    }
  }, [atual?.id, prog?.current_discipline_id, prog?.current_session_started_at, storageKey]);

  useEffect(() => {
    if (!activeSince) return;
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeSince) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeSince]);

  async function handleContinueStudy() {
    if (!atual || !storageKey) return;
    setStartingStudy(true);
    try {
      const started = await onStartSession(cycle.id, atual.id);
      if (!started?.ok) return;
      const startedAt = Date.parse(started.started_at ?? new Date().toISOString());
      const ms = Number.isFinite(startedAt) ? startedAt : Date.now();
      window.localStorage.setItem(storageKey, String(ms));
      setActiveSince(ms);
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - ms) / 1000)));
      await navigate({
        to: "/questoes",
        search: {
          disciplina: atual.discipline,
          cycle_id: cycle.id,
          cycle_discipline_id: atual.id,
          planned_minutes: atual.study_minutes,
          questions_goal: atual.questions_goal,
        } as never,
      });
    } finally {
      setStartingStudy(false);
    }
  }

  async function saveCurrentSession(completed: boolean) {
    if (!atual) return false;
    const studiedMinutes = Math.max(activeSince ? 1 : 0, Math.round(elapsedSeconds / 60));
    const saved = await onRegisterSession({
      cycle_id: cycle.id,
      cycle_discipline_id: atual.id,
      discipline: atual.discipline,
      planned_minutes: atual.study_minutes,
      studied_minutes: studiedMinutes,
      questions_answered: 0,
      correct_answers: 0,
      wrong_answers: 0,
      completed,
      advance: completed,
    });

    if (saved && storageKey) window.localStorage.removeItem(storageKey);
    if (saved) {
      setActiveSince(null);
      setElapsedSeconds(0);
      toast.success(
        completed ? "Disciplina concluída e ciclo avançado" : "Ciclo pausado e progresso salvo",
      );
    }
    return Boolean(saved);
  }

  async function handleNext() {
    if (activeSince) {
      await saveCurrentSession(true);
      return;
    }
    onAdvance();
  }

  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`;

  return (
    <Card className="overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-indigo-500/15 text-indigo-300">
              Ciclo principal
            </Badge>
            {cycle.status === "paused" && <Badge variant="outline">Pausado</Badge>}
          </div>
          <CardTitle className="mt-2 text-2xl">{cycle.name}</CardTitle>
          {cycle.description && (
            <p className="mt-1 text-sm text-muted-foreground">{cycle.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => saveCurrentSession(false)}
            disabled={!atual || !activeSince}
          >
            <Pause className="h-4 w-4" /> Pausar
          </Button>
          <Button size="sm" className="gap-2" onClick={handleNext} disabled={!atual}>
            <ArrowRight className="h-4 w-4" /> Próxima disciplina
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {atual ? (
          <div className="rounded-xl border bg-card/50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Agora</p>
                <h3 className="text-xl font-semibold">{atual.discipline}</h3>
              </div>
              <div className="hidden gap-4 md:flex">
                <Stat icon={Timer} label="Tempo" value={`${atual.study_minutes} min`} />
                <Stat icon={Target} label="Meta" value={`${atual.questions_goal} questões`} />
                <Stat
                  icon={Clock}
                  label="Em andamento"
                  value={activeSince ? elapsedLabel : "Pausado"}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {revisoesDaDisciplina > 0 && (
                <div className="basis-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  Existem {revisoesDaDisciplina} revisões pendentes de {atual.discipline}. Revise antes de continuar para reforçar a retenção.
                </div>
              )}
              <Button onClick={handleContinueStudy} disabled={startingStudy} className="gap-2">
                {startingStudy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Continuar Estudo
              </Button>
              <Link
                to="/revisoes"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <CheckCircle2 className="h-4 w-4" /> Ver revisões
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Adicione disciplinas para iniciar este ciclo.
          </p>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso do ciclo</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <Timeline items={ativas} currentPos={pos} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="Disciplinas" value={ativas.length} />
          <MiniStat label="Ciclos concluídos" value={prog?.completed_cycles ?? 0} />
          <MiniStat label="Sequência" value={prog?.current_streak ?? 0} />
          <MiniStat label="Tempo/dia" value={`${cycle.estimated_daily_minutes} min`} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="Tempo realizado" value={`${stats?.studiedMinutes ?? 0} min`} />
          <MiniStat label="Questões" value={stats?.questionsAnswered ?? 0} />
          <MiniStat label="Precisão" value={`${stats?.precision ?? 0}%`} />
          <MiniStat label="Sessões" value={stats?.completedSessions ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function Timeline({
  items,
  currentPos,
}: {
  items: { id: string; discipline: string }[];
  currentPos: number;
}) {
  if (!items.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {items.map((d, i) => {
        const state = i < currentPos ? "done" : i === currentPos ? "current" : "next";
        return (
          <div
            key={d.id}
            className={cn(
              "flex min-w-[140px] flex-col gap-1 rounded-lg border px-3 py-2 text-xs transition",
              state === "done" && "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
              state === "current" &&
                "border-indigo-500/60 bg-indigo-500/10 text-foreground shadow-sm",
              state === "next" && "text-muted-foreground",
            )}
          >
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {state === "done" ? "Concluída" : state === "current" ? "Atual" : `#${i + 1}`}
            </span>
            <span className="truncate font-medium">{d.discipline}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function CicloCard({
  cycle,
  discs,
  prog,
  onSetDefault,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  cycle: StudyCycle;
  discs: { id: string; discipline: string; enabled: boolean }[];
  prog: { current_position: number; completed_cycles: number } | undefined;
  onSetDefault: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const ativas = discs.filter((d) => d.enabled);
  const pct = ativas.length ? Math.round(((prog?.current_position ?? 0) / ativas.length) * 100) : 0;
  return (
    <Card className={cn(cycle.is_default && "border-indigo-500/40")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{cycle.name}</CardTitle>
            {cycle.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cycle.description}</p>
            )}
          </div>
          {cycle.is_default && (
            <Badge variant="secondary" className="bg-indigo-500/15 text-indigo-300">
              Principal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> {ativas.length} disciplinas
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {cycle.estimated_daily_minutes} min/dia
          </span>
        </div>
        <Progress value={pct} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct}% do ciclo</span>
          <span>{prog?.completed_cycles ?? 0} concluídos</span>
        </div>
        <div className="flex gap-2 pt-1">
          {!cycle.is_default && (
            <Button variant="outline" size="sm" className="gap-1" onClick={onSetDefault}>
              <Star className="h-3.5 w-3.5" /> Tornar principal
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CicloFormDialog({
  mode,
  initialCycle,
  initialDisciplines = [],
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  initialCycle?: StudyCycle;
  initialDisciplines?: StudyCycleDiscipline[];
  onSubmit: (input: {
    name: string;
    description?: string;
    estimated_daily_minutes: number;
    disciplines: DisciplineDraft[];
    is_default: boolean;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialCycle?.name ?? "");
  const [description, setDescription] = useState(initialCycle?.description ?? "");
  const [dailyMin, setDailyMin] = useState(initialCycle?.estimated_daily_minutes ?? 60);
  const [isDefault, setIsDefault] = useState(initialCycle?.is_default ?? true);
  const [items, setItems] = useState<DisciplineDraft[]>(
    initialDisciplines.length
      ? initialDisciplines.filter((d) => d.enabled).map((d) => ({
          id: d.id,
          discipline_id: d.discipline_id,
          discipline: d.discipline,
          study_minutes: d.study_minutes,
          questions_goal: d.questions_goal,
          enabled: d.enabled,
        }))
      : [
          { discipline: "Português", study_minutes: 30, questions_goal: 10 },
          { discipline: "Direito Constitucional", study_minutes: 30, questions_goal: 10 },
        ],
  );
  const [saving, setSaving] = useState(false);

  function addItem() {
    setItems((x) => [...x, { discipline: "", study_minutes: 30, questions_goal: 10 }]);
  }
  function removeItem(i: number) {
    setItems((x) => x.filter((_, k) => k !== i));
  }
  function updateItem(i: number, patch: Partial<DisciplineDraft>) {
    setItems((x) => x.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((x) => {
      const j = i + dir;
      if (j < 0 || j >= x.length) return x;
      const c = [...x];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  async function submit() {
    const cleaned = items
      .map((i) => ({ ...i, discipline: i.discipline.trim() }))
      .filter((i) => i.discipline);
    if (!name.trim()) {
      toast.error("Dê um nome ao ciclo");
      return;
    }
    if (cleaned.length < 2) {
      toast.error("Adicione ao menos 2 disciplinas");
      return;
    }
    setSaving(true);
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      estimated_daily_minutes: dailyMin,
      disciplines: cleaned,
      is_default: isDefault,
    });
    setSaving(false);
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Novo ciclo de estudos" : "Editar ciclo de estudos"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ciclo TRT"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meta diária (min)</Label>
            <Input
              type="number"
              min={15}
              max={720}
              value={dailyMin}
              onChange={(e) => setDailyMin(Number(e.target.value) || 60)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objetivo, foco, observações..."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Sequência de disciplinas</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div
                key={it.id ?? `novo-${i}`}
                className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-card/40 p-2"
              >
                <div className="col-span-6 space-y-1">
                  <Label className="text-xs">#{i + 1} Disciplina</Label>
                  <Input
                    list="disc-sug"
                    value={it.discipline}
                    onChange={(e) => updateItem(i, { discipline: e.target.value })}
                    placeholder="Ex.: Português"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    min={5}
                    value={it.study_minutes}
                    onChange={(e) => updateItem(i, { study_minutes: Number(e.target.value) || 30 })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Meta Q</Label>
                  <Input
                    type="number"
                    min={0}
                    value={it.questions_goal}
                    onChange={(e) => updateItem(i, { questions_goal: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} title="Subir">
                    ↑
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} title="Descer">
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(i)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <datalist id="disc-sug">
            {DISCIPLINAS_SUGERIDAS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Definir como ciclo principal
        </label>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "create" ? "Criar ciclo" : "Salvar ciclo"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
