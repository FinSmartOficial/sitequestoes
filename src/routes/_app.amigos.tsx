import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Check, X, Ban, UserMinus, Users, BellRing, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAmigos,
  usePedidosPendentes,
  useSearchProfiles,
  useBloqueados,
  useEnviarPedido,
  useAceitarPedido,
  useRecusarPedido,
  useRemoverAmizade,
  useBloquearUsuario,
  useDesbloquearUsuario,
} from "@/api/hooks";
import type { PerfilMiniDTO } from "@/api/friends";
import { usePresence, statusLabel, type PresenceStatus } from "@/hooks/usePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RankBadge } from "@/components/xp/RankBadge";

export const Route = createFileRoute("/_app/amigos")({
  head: () => ({
    meta: [
      { title: "Amigos — FinSmart Tec" },
      { name: "description", content: "Sua rede social de estudos." },
    ],
  }),
  component: AmigosPage,
});

function initials(nome: string | null, sobrenome: string | null | undefined, username: string | null) {
  const base = [nome, sobrenome].filter(Boolean).join(" ") || username || "??";
  return base.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function fullName(p: Pick<PerfilMiniDTO, "nome" | "sobrenome" | "username">) {
  return [p.nome, p.sobrenome].filter(Boolean).join(" ") || p.username || "Estudante";
}

function AmigoCard({
  perfil, status, action,
}: { perfil: PerfilMiniDTO; status?: PresenceStatus; action?: React.ReactNode }) {
  const { label, color } = statusLabel(status);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:border-primary/40 hover:shadow-[0_10px_28px_-16px_var(--primary)]"
    >
      <Link
        to="/perfil/$username"
        params={{ username: perfil.username ?? perfil.id }}
        className="relative shrink-0"
      >
        <Avatar className="h-11 w-11 ring-2 ring-transparent transition group-hover:ring-primary/40">
          {perfil.avatar_url && <AvatarImage src={perfil.avatar_url} />}
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-xs font-semibold text-primary-foreground">
            {initials(perfil.nome, perfil.sobrenome, perfil.username)}
          </AvatarFallback>
        </Avatar>
        <span
          title={label}
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card ${color}`}
        />
      </Link>
      <Link
        to="/perfil/$username"
        params={{ username: perfil.username ?? perfil.id }}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium">{fullName(perfil)}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RankBadge nivel={perfil.nivel} size="xs" tooltip />
          {perfil.username && <span className="truncate">@{perfil.username}</span>}
          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>Nível {perfil.nivel}</span>
        </div>
      </Link>
      {action}
    </motion.div>
  );
}

function AmigosPage() {
  const { user } = useAuth();
  const meuId = user?.id ?? null;

  const { online } = usePresence(meuId, "online");

  const { data: amigos = [] } = useAmigos(meuId);
  const { data: pedidos = [] } = usePedidosPendentes(meuId);

  const [tab, setTab] = useState<"amigos" | "pendentes" | "buscar" | "bloqueados">("amigos");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data: buscaRaw = [], isFetching: buscando } = useSearchProfiles(debounced, debounced.length >= 2);
  const busca = useMemo(() => buscaRaw.filter((p) => p.id !== meuId), [buscaRaw, meuId]);

  const { data: bloqueados = [] } = useBloqueados(meuId, tab === "bloqueados");

  const enviarMut = useEnviarPedido();
  const aceitarMut = useAceitarPedido();
  const recusarMut = useRecusarPedido();
  const removerMut = useRemoverAmizade();
  const bloquearMut = useBloquearUsuario();
  const desbloquearMut = useDesbloquearUsuario();

  const amigosOrdenados = useMemo(() => {
    return [...amigos].sort((a, b) => {
      const oa = online[a.id] ? 0 : 1;
      const ob = online[b.id] ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return fullName(a).localeCompare(fullName(b));
    });
  }, [amigos, online]);

  const contadorOnline = useMemo(
    () => amigos.filter((a) => online[a.id]).length,
    [amigos, online],
  );

  async function enviarPedido(outroId: string) {
    try {
      await enviarMut.mutateAsync(outroId);
      toast.success("Pedido enviado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes("duplicate") ? "Pedido já enviado" : msg);
    }
  }

  async function aceitarPedido(id: string) {
    await aceitarMut.mutateAsync(id);
    toast.success("Amizade aceita");
  }

  async function recusarPedido(id: string) {
    await recusarMut.mutateAsync(id);
  }

  async function removerAmigo(outroId: string) {
    await removerMut.mutateAsync(outroId);
    toast("Amizade removida");
  }

  async function bloquear(outroId: string) {
    await bloquearMut.mutateAsync(outroId);
    toast("Usuário bloqueado");
  }

  async function desbloquear(outroId: string) {
    await desbloquearMut.mutateAsync(outroId);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Users className="h-6 w-6 text-primary" /> Amigos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {amigos.length} amigos · <span className="text-emerald-400">{contadorOnline} online</span>
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setTab("buscar"); }}
            placeholder="Buscar por nome ou @username"
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="amigos"><Users className="mr-1 h-3.5 w-3.5" />Amigos</TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-1">
            <BellRing className="h-3.5 w-3.5" />Pedidos
            {pedidos.length > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px]">{pedidos.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="buscar"><Search className="mr-1 h-3.5 w-3.5" />Buscar</TabsTrigger>
          <TabsTrigger value="bloqueados"><Ban className="mr-1 h-3.5 w-3.5" />Bloqueados</TabsTrigger>
        </TabsList>

        <TabsContent value="amigos" className="mt-4">
          {amigosOrdenados.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum amigo ainda" hint="Use a busca acima para encontrar pessoas." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {amigosOrdenados.map((a) => (
                  <AmigoCard
                    key={a.id}
                    perfil={a}
                    status={online[a.id] ?? "offline"}
                    action={
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => removerAmigo(a.id)} title="Remover amizade">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => bloquear(a.id)} title="Bloquear">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="mt-4">
          {pedidos.length === 0 ? (
            <EmptyState icon={BellRing} title="Sem pedidos pendentes" hint="Você verá aqui os convites recebidos em tempo real." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {pedidos.map((p) => p.perfil && (
                  <AmigoCard
                    key={p.id}
                    perfil={p.perfil}
                    status={online[p.perfil.id]}
                    action={
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => aceitarPedido(p.id)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => recusarPedido(p.id)} title="Recusar">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="buscar" className="mt-4">
          {q.trim().length < 2 ? (
            <EmptyState icon={Search} title="Digite para buscar" hint="Nome completo ou @username, mínimo 2 caracteres." />
          ) : buscando ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procurando…
            </div>
          ) : busca.length === 0 ? (
            <EmptyState icon={Search} title="Nada encontrado" hint={`Nenhum perfil corresponde a "${q}".`} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {busca.map((p) => {
                const jaAmigo = amigos.some((a) => a.id === p.id);
                const pedidoRecebido = pedidos.find((pp) => pp.perfil?.id === p.id);
                return (
                  <AmigoCard
                    key={p.id}
                    perfil={p}
                    status={online[p.id]}
                    action={
                      jaAmigo ? (
                        <Badge variant="outline" className="text-[10px]">Amigo</Badge>
                      ) : pedidoRecebido ? (
                        <Button size="sm" onClick={() => aceitarPedido(pedidoRecebido.id)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => enviarPedido(p.id)}>
                          <UserPlus className="mr-1 h-3.5 w-3.5" /> Adicionar
                        </Button>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bloqueados" className="mt-4">
          {bloqueados.length === 0 ? (
            <EmptyState icon={Ban} title="Nenhum usuário bloqueado" hint="Você pode bloquear qualquer pessoa a partir da aba Amigos." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {bloqueados.map((b) => (
                <AmigoCard
                  key={b.id}
                  perfil={b}
                  action={
                    <Button size="sm" variant="outline" onClick={() => desbloquear(b.id)}>
                      Desbloquear
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon, title, hint,
}: { icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
