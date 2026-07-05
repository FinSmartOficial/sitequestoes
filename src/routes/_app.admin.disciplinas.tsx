import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { admin } from "@/api";

export const Route = createFileRoute("/_app/admin/disciplinas")({
  component: AdminDisciplinas,
});

type Row = { materia: string; total: number };

function AdminDisciplinas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await admin.fetchDisciplinasSample(10000);
      const map = new Map<string, number>();
      data.forEach((r) => {
        const m = r.materia ?? "Sem matéria";
        map.set(m, (map.get(m) ?? 0) + 1);
      });
      setRows(Array.from(map, ([materia, total]) => ({ materia, total })).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.materia} className="flex items-center gap-3 border-border/60 p-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="font-semibold">{r.materia}</div>
            <div className="text-xs text-muted-foreground">Disciplina</div>
          </div>
          <Badge variant="secondary">{r.total}</Badge>
        </Card>
      ))}
      {rows.length === 0 && (
        <div className="col-span-full rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          Nenhuma disciplina cadastrada ainda.
        </div>
      )}
    </div>
  );
}
