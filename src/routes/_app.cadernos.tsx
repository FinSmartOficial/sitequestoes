import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, Plus, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNotebooks, useCreateNotebook, useDeleteNotebook } from "@/api";

export const Route = createFileRoute("/_app/cadernos")({
  head: () => ({
    meta: [
      { title: "Cadernos — FinSmart Tec" },
      { name: "description", content: "Organize suas questões em cadernos pessoais." },
    ],
  }),
  component: CadernosPage,
});

function CadernosPage() {
  const { data: notebooks, isLoading } = useNotebooks();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Cadernos"
        description="Coleções pessoais de questões — sincronizadas pelo backend."
        icon={BookMarked}
        action={<NovoCadernoDialog />}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : (notebooks?.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-2">
            <BookMarked className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não tem cadernos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks!.map((nb) => (
            <NotebookCard key={nb.id} id={nb.id} name={nb.name} description={nb.description} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotebookCard({
  id, name, description,
}: { id: string; name: string; description: string | null }) {
  const del = useDeleteNotebook();
  return (
    <Card className="border-border/60 hover:border-primary/40 transition-colors">
      <CardContent className="p-5 space-y-3">
        <Link to="/cadernos/$id" params={{ id }} className="block">
          <h3 className="font-semibold">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
          )}
        </Link>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={del.isPending}
            onClick={() => {
              if (!confirm(`Excluir o caderno "${name}"?`)) return;
              del.mutate(id, {
                onSuccess: () => toast.success("Caderno excluído"),
                onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NovoCadernoDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateNotebook();

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: () => {
          toast.success("Caderno criado");
          setOpen(false);
          setName("");
          setDescription("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Caderno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Caderno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nb-name">Nome</Label>
            <Input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb-desc">Descrição (opcional)</Label>
            <Textarea
              id="nb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
