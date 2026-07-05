import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Loader2, AlertTriangle, CheckCircle2, XCircle, ThumbsUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useReviewQueue, useReviewAnswer, useQuestion } from "@/api";

export const Route = createFileRoute("/_app/revisoes")({
  head: () => ({
    meta: [
      { title: "Revisões — FinSmart Tec" },
      { name: "description", content: "Sua fila de revisões espaçadas de hoje." },
    ],
  }),
  component: RevisoesPage,
});

function RevisoesPage() {
  const { data, isLoading } = useReviewQueue(50);
  const [idx, setIdx] = useState(0);
  const items = data?.items ?? [];
  const current = items[idx];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Revisão Inteligente"
        description="Fila de hoje priorizada pelo backend. Toda decisão SRS é server-authoritative."
        icon={Brain}
      />

      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-lg font-medium">Nenhuma revisão pendente</p>
            <p className="text-sm text-muted-foreground">Você está em dia. Bom trabalho!</p>
          </CardContent>
        </Card>
      ) : current ? (
        <ReviewItemCard
          key={current.review_id}
          item={current}
          onNext={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
          isLast={idx >= items.length - 1}
          index={idx}
          total={items.length}
        />
      ) : null}
    </div>
  );
}

function ReviewItemCard({
  item, onNext, isLast, index, total,
}: {
  item: NonNullable<ReturnType<typeof useReviewQueue>["data"]>["items"][number];
  onNext: () => void;
  isLast: boolean;
  index: number;
  total: number;
}) {
  const { data: question, isLoading } = useQuestion(item.question_id);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctId: string | null } | null>(null);
  const answer = useReviewAnswer();

  const respond = async (altId: string) => {
    if (feedback || answer.isPending) return;
    setSelected(altId);
    try {
      const res = await answer.mutateAsync({
        question_id: item.question_id,
        alternative_id: altId,
        review_id: item.review_id,
        // qualidade preliminar; ajustada abaixo pelo usuário via botões SM-2
        quality: 3,
      });
      setFeedback({ correct: res.is_correct, correctId: res.correct_alternative_id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar");
      setSelected(null);
    }
  };

  const grade = async (quality: number) => {
    // Segunda chamada apenas para atualizar quality SRS
    try {
      await answer.mutateAsync({
        question_id: item.question_id,
        review_id: item.review_id,
        alternative_id: selected,
        quality,
      });
      toast.success("Nota registrada");
      onNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Item {index + 1} de {total}</span>
          {item.overdue_days > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Atraso: {item.overdue_days}d
            </Badge>
          )}
        </div>

        {isLoading || !question ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.statement}</p>

            <div className="space-y-2">
              {question.alternatives
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((alt) => {
                  const isSel = selected === alt.id;
                  const isCorrect = feedback?.correctId === alt.id;
                  const isWrong = feedback && isSel && !feedback.correct;
                  return (
                    <button
                      key={alt.id}
                      type="button"
                      disabled={!!feedback || answer.isPending}
                      onClick={() => respond(alt.id)}
                      className={
                        "w-full text-left rounded-lg border p-3 text-sm transition-colors " +
                        (isCorrect
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : isWrong
                            ? "border-rose-500/60 bg-rose-500/10"
                            : isSel
                              ? "border-primary bg-primary/5"
                              : "border-border/60 hover:bg-muted/50 disabled:opacity-60")
                      }
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">{alt.letter}.</span>
                      {alt.content}
                      {isCorrect && <CheckCircle2 className="inline h-4 w-4 ml-2 text-emerald-500" />}
                      {isWrong && <XCircle className="inline h-4 w-4 ml-2 text-rose-500" />}
                    </button>
                  );
                })}
            </div>

            {feedback && (
              <div className="border-t border-border/60 pt-4 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> Auto-avaliação (SM-2)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((q) => (
                    <Button
                      key={q}
                      variant={q >= 3 ? "default" : "outline"}
                      size="sm"
                      disabled={answer.isPending}
                      onClick={() => grade(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={onNext} disabled={isLast}>
                    Pular
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
