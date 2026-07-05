import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/admin/logs")({
  component: AdminLogs,
});

type Log = {
  id: number;
  admin_id: string | null;
  admin_email: string | null;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  detalhes: unknown;
  criado_em: string;
};

function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("admin_logs")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(200);
      setLogs((data ?? []) as Log[]);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <ScrollText className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Auditoria administrativa</span>
        <Badge variant="secondary" className="ml-auto">{logs.length}</Badge>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.criado_em).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {l.admin_email ?? l.admin_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase">{l.acao}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.entidade}
                    {l.entidade_id && <span className="text-muted-foreground"> · {l.entidade_id}</span>}
                  </TableCell>
                  <TableCell className="max-w-md truncate font-mono text-[10px] text-muted-foreground">
                    {l.detalhes ? JSON.stringify(l.detalhes) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum log registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
