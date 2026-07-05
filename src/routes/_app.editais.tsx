import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  FileBadge, Star, StarOff, CheckCircle2, MapPin, Building2, CalendarDays,
  Users2, Search, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditais, useMeuEdital } from "@/api";
import type { ExamDTO as Edital } from "@/api/exams";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/editais")({
  head: () => ({
    meta: [
      { title: "Editais Inteligentes — FinSmart Tec" },
      {
        name: "description",
        content:
          "Escolha seu concurso alvo e transforme toda a plataforma em um plano focado na aprovação.",
      },
    ],
  }),
  component: EditaisPage,
});

function diasAte(iso: string | null) {
  if (!iso) return null;
  const diff = Math.ceil((+new Date(iso) - Date.now()) / 86400000);
  return diff;
}

function EditalCard({
  e,
  principal,
  favorito,
  onSelecionar,
  onFavoritar,
}: {
  e: Edital;
  principal: boolean;
  favorito: boolean;
  onSelecionar: () => void;
  onFavoritar: () => void;
}) {
  const dias = diasAte(e.data_prova);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all",
        principal
          ? "border-primary/60 shadow-[0_20px_60px_-24px_hsl(var(--primary)/.45)]"
          : "border-border/60 hover:border-primary/40",
      )}
    >
      {principal && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
          <CheckCircle2 className="h-3 w-3" /> Principal
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary-glow/10 ring-1 ring-primary/20">
          <FileBadge className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {e.banca ?? "—"} {e.ano ? `· ${e.ano}` : ""}
          </div>
          <h3 className="truncate text-base font-semibold">{e.nome}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {e.cargo ?? e.area ?? "Cargo não informado"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {e.orgao && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> <span className="truncate">{e.orgao}</span>
          </div>
        )}
        {(e.estado || e.cidade) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {[e.cidade, e.estado].filter(Boolean).join(" / ")}
            </span>
          </div>
        )}
        {typeof e.vagas === "number" && (
          <div className="flex items-center gap-1.5">
            <Users2 className="h-3.5 w-3.5" /> {e.vagas} vagas
          </div>
        )}
        {e.data_prova && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(e.data_prova).toLocaleDateString("pt-BR")}
          </div>
        )}
      </div>

      {dias !== null && dias >= 0 && (
        <Badge
          variant="secondary"
          className="mt-3 border-0 bg-amber-500/15 text-amber-400"
        >
          Faltam {dias} dias para a prova
        </Badge>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={onSelecionar}
          variant={principal ? "secondary" : "default"}
        >
          {principal ? "Selecionado" : "Selecionar como principal"}
        </Button>
        <Button size="icon" variant="ghost" onClick={onFavoritar} aria-label="Favoritar">
          {favorito ? (
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="Progresso">
          <Link to="/editais/$id" params={{ id: e.id }}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function EditaisPage() {
  const { editais, loading } = useEditais();
  const { principalId, favoritos, selecionar, favoritar } = useMeuEdital();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return editais;
    return editais.filter((e) =>
      [e.nome, e.orgao, e.cargo, e.banca, e.estado, e.area]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(t)),
    );
  }, [editais, q]);

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <PageHeader
        title="Editais Inteligentes"
        description="Escolha seu concurso alvo e toda a plataforma passa a trabalhar em função da sua aprovação."
        icon={FileBadge}
      />

      <Card className="mb-6 border-border/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por órgão, cargo, banca, estado..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Nenhum edital cadastrado ainda. Peça ao administrador para cadastrar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EditalCard
              key={e.id}
              e={e}
              principal={principalId === e.id}
              favorito={favoritos.includes(e.id)}
              onSelecionar={() => selecionar(e.id)}
              onFavoritar={() => favoritar(e.id, !favoritos.includes(e.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
