import { createFileRoute } from "@tanstack/react-router";
import { Shield, Users, Database, Plus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { admin } from "@/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/questoes")({
  head: () => ({ meta: [{ title: "Painel Admin — FinSmart Tec" }] }),
  component: AdminPage,
});

type ProfileRow = admin.AdminProfileRow;

function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [totalQ, setTotalQ] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  // form
  const [materia, setMateria] = useState("");
  const [topico, setTopico] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [gabarito, setGabarito] = useState<"C" | "E">("C");
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [u, count] = await Promise.all([
        admin.listProfilesForAdmin(),
        admin.countQuestoes(),
      ]);
      setUsers(u);
      setTotalQ(count);
      setCarregando(false);
    })();
  }, [isAdmin]);

  async function adicionarQuestao(e: React.FormEvent) {
    e.preventDefault();
    if (!materia || !enunciado) return toast.error("Preencha matéria e enunciado.");
    setSalvando(true);
    try {
      await admin.insertQuestaoBanco({
        materia, topico: topico || null, banca: "CEBRASPE", tipo: "CE",
        enunciado, gabarito_ce: gabarito === "C", comentario: comentario || null,
      });
      toast.success("Questão adicionada ao banco");
      setEnunciado(""); setTopico(""); setComentario("");
      setTotalQ((n) => (n ?? 0) + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Acesso negado" description="Esta área é exclusiva para administradores." icon={Shield} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Apenas a conta <span className="font-mono text-foreground">suportefinsmart@gmail.com</span> tem acesso ao painel.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader title="Painel Admin" description="Gestão de usuários e banco de questões." icon={Shield} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Usuários cadastrados</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{users.length}</p></CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="h-4 w-4" /> Questões no banco</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{totalQ ?? "—"}</p></CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Banca padrão</CardTitle></CardHeader>
          <CardContent><Badge className="text-base">CEBRASPE · Certo/Errado</Badge></CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" /> Adicionar nova questão (CESPE C/E)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={adicionarQuestao} className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Matéria *</Label>
              <Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Direito Constitucional" />
            </div>
            <div>
              <Label className="text-xs">Tópico</Label>
              <Input value={topico} onChange={(e) => setTopico(e.target.value)} placeholder="Direitos sociais" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Enunciado *</Label>
              <Textarea rows={4} value={enunciado} onChange={(e) => setEnunciado(e.target.value)} placeholder="Texto do item de prova..." />
            </div>
            <div>
              <Label className="text-xs">Gabarito</Label>
              <Select value={gabarito} onValueChange={(v) => setGabarito(v as "C" | "E")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">CERTO</SelectItem>
                  <SelectItem value="E">ERRADO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Comentário (opcional)</Label>
              <Input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Art. 5º, X, CF/88..." />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Adicionar ao banco"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Usuários cadastrados</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{u.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
