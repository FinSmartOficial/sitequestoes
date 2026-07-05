import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Shield, LayoutDashboard, Users, FileQuestion, Swords,
  Target, Settings, ScrollText, Loader2, BookOpen, FileBadge, Trophy, Sparkles, ShieldCheck,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — FinSmart Tec" }] }),
  component: AdminLayout,
});

const tabs: { to: string; icon: typeof Users; label: string; exact?: boolean }[] = [
  { to: "/admin",                icon: LayoutDashboard, label: "Dashboard",     exact: true },
  { to: "/admin/usuarios",       icon: Users,           label: "Usuários" },
  { to: "/admin/questoes",       icon: FileQuestion,    label: "Questões" },
  { to: "/admin/qualidade",      icon: ShieldCheck,     label: "Qualidade" },
  { to: "/admin/explicacoes",    icon: Sparkles,        label: "Explicações" },
  { to: "/admin/disciplinas",    icon: BookOpen,        label: "Disciplinas" },
  { to: "/admin/editais",        icon: FileBadge,       label: "Editais" },
  { to: "/admin/rankings",       icon: Trophy,          label: "Rankings" },
  { to: "/admin/arena",          icon: Swords,          label: "Arena Live" },
  { to: "/admin/missoes",        icon: Target,          label: "Missões" },
  { to: "/admin/configuracoes",  icon: Settings,        label: "Configurações" },
  { to: "/admin/logs",           icon: ScrollText,      label: "Logs" },
];


function AdminLayout() {
  const { isAdmin, loading } = useIsAdmin();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <Shield className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este painel é restrito a super administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_10px_30px_-10px_rgba(245,158,11,.6)]">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
            Área restrita
          </div>
          <h1 className="text-xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie toda a plataforma sem tocar em código.
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <nav className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-card/50 p-1.5">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>

          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
