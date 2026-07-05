import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileQuestion, Loader2, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuestions, useAnswerQuestion, type questions as qApi } from "@/api";

export const Route = createFileRoute("/_app/questoes")({
  head: () => ({
    meta: [
      { title: "Banco de Questões — FinSmart Tec" },
      { name: "description", content: "Explore o banco de questões, filtre por disciplina e responda." },
    ],
  }),
  component: QuestoesPage,
});

type QuestionItem = Awaited<ReturnType<typeof qApi.searchQuestions>>["items"][number];

function QuestoesPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, isFetching } = useQuestions({ q: q || undefined }, page, pageSize);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Banco de Questões"
        description="Filtre, responda e acompanhe seu desempenho — tudo persistido pelo backend."
        icon={FileQuestion}
      />

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar no enunciado..."
              className="border-none focus-visible:ring-0 shadow-none"
            />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma questão encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data!.items.map((item) => (
            <QuestionCard key={item.id} question={item} />
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Página {data!.page} de {totalPages} · {data!.total} questões
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prefere revisão espaçada? <Link to="/revisoes" className="underline">Ir para revisões</Link>
      </p>
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionItem }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correctId: string | null } | null>(null);
  const answer = useAnswerQuestion();

  const handleSubmit = async (altId: string) => {
    if (result || answer.isPending) return;
    setSelected(altId);
    try {
      const res = await answer.mutateAsync({
        question_id: question.id,
        alternative_id: altId,
        origin: "banco",
      });
      setResult({ correct: res.is_correct, correctId: res.correct_alternative_id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar resposta");
      setSelected(null);
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {question.code && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {question.code}
              </Badge>
            )}
            {question.year && (
              <Badge variant="secondary" className="ml-1">
                {question.year}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.statement}</p>

        <div className="space-y-2">
          {question.alternatives
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((alt) => {
              const isSelected = selected === alt.id;
              const isCorrect = result?.correctId === alt.id;
              const isWrongPick = result && isSelected && !result.correct;
              return (
                <button
                  key={alt.id}
                  type="button"
                  disabled={!!result || answer.isPending}
                  onClick={() => handleSubmit(alt.id)}
                  className={
                    "w-full text-left rounded-lg border p-3 text-sm transition-colors " +
                    (isCorrect
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : isWrongPick
                        ? "border-rose-500/60 bg-rose-500/10"
                        : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:bg-muted/50 disabled:opacity-60")
                  }
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">{alt.letter}.</span>
                  {alt.content}
                  {isCorrect && <CheckCircle2 className="inline h-4 w-4 ml-2 text-emerald-500" />}
                  {isWrongPick && <XCircle className="inline h-4 w-4 ml-2 text-rose-500" />}
                </button>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
