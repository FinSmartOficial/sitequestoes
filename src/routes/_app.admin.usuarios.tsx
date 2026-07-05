import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/admin/usuarios")({
  component: AdminUsuarios,
});

type Row = { id: string; nome: string | null; email: string | null; username: string | null; nivel: number | null; liga: string | null; created_at: string };

function AdminUsuarios() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,nome,email,username,nivel,liga,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.nome?.toLowerCase().includes(t) ||
        r.email?.toLowerCase().includes(t) ||
        r.username?.toLowerCase().includes(t),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou username…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} usuários</Badge>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Liga</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">@{r.username ?? "—"}</TableCell>
                    <TableCell>{r.nivel ?? 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.liga ?? "Bronze"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {r.username && (
                        <Link
                          to="/perfil/$username"
                          params={{ username: r.username }}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
