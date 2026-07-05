import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookMarked, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useNotebook, useNotebookQuestions, useRemoveQuestionFromNotebook,
} from "@/api";

export const Route = createFileRoute("/_app/cadernos/$id")({
  head: () => ({
    meta: [{ title: "Caderno — FinSmart Tec" }],
  }),
  component: CadernoDetalhePage,
});

function CadernoDetalhePage() {
  const { id } = Route.useParams();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: notebook, isLoading: loadingNb } = useNotebook(id);
  const { data: qs, isLoading: loadingQs, isFetching } = useNotebookQuestions(id, page, pageSize);
  const remove = useRemoveQuestionFromNotebook();

  const totalPages = Math.max(1, Math.ceil((qs?.total ?? 0) / pageSize));

  if (loadingNb) return <Skeleton className="h-40 w-full mx-auto max-w-5xl" />;
  if (!notebook) return <p className="text-center text-muted-foreground">Caderno não encontrado.</p>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link to="/cadernos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader
        title={notebook.name}
        description={notebook.description ?? "Sem descrição"}
        icon={BookMarked}
      />

      {loadingQs ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (qs?.items.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhuma questão neste caderno ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {qs!.items.map((it) => {
              const q = it.question as { id: string; statement?: string; code?: string | null };
              return (
                <Card key={it.notebook_question_id} className="border-border/60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        {q.code && <Badge variant="outline" className="font-mono text-[10px]">{q.code}</Badge>}
                        <p className="text-sm line-clamp-3">{q.statement ?? ""}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (!confirm("Remover esta questão do caderno?")) return;
                          remove.mutate(
                            { notebookId: id, questionId: q.id },
                            {
                              onSuccess: () => toast.success("Removida"),
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
                            },
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {qs!.page} de {totalPages} · {qs!.total} questões
              {isFetching && <Loader2 className="inline h-3 w-3 ml-2 animate-spin" />}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
