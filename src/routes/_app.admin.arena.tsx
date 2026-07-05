import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Swords, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useArenaAdminSalas } from "@/api/hooks";

export const Route = createFileRoute("/_app/admin/arena")({
  component: AdminArena,
});

function AdminArena() {
  const { data, isLoading } = useArenaAdminSalas(3000);
  const salas = data?.salas ?? [];
  const participantes = data?.participantes ?? [];

  const statusTint: Record<string, string> = {
    aguardando: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    contagem: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    em_partida: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    resultado: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    finalizando: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };

  const countBySala = participantes.reduce<Record<string, number>>((acc, p) => {
    acc[p.sala_id] = (acc[p.sala_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Swords className="h-4 w-4 text-fuchsia-400" />
        <span className="text-sm font-semibold">Salas da Arena (tempo real)</span>
        <Badge variant="secondary" className="ml-auto">{salas.length}</Badge>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : salas.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Nenhuma sala ativa no momento.
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {salas.map((s) => (
            <div key={s.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusTint[s.status] ?? statusTint.aguardando}`}>
                  {s.status.replace("_", " ")}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {countBySala[s.id] ?? 0}/{s.max_jogadores}
                </span>
              </div>
              <div className="truncate text-sm font-semibold">{s.nome}</div>
              <div className="truncate text-xs text-muted-foreground">{s.materia}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{s.id.slice(0, 8)}</div>
              <div className="mt-2 text-xs">
                Questão: <span className="font-semibold">{(s.rodada_atual ?? 0) + 1}</span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Criada {new Date(s.created_at).toLocaleTimeString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
