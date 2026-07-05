import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings, KeyRound, AlertTriangle, Bell, Moon, LogOut } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { usePersistedState } from "@/lib/usePersistedState";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdatePassword, usePurgeAccount } from "@/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FinSmart Tec" },
      { name: "description", content: "Preferências da conta, segurança e zona de perigo." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePersistedState("fst:prefs", { notificacoes: true, escuro: true, somPomodoro: false });
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const updatePassword = useUpdatePassword();
  const purgeAccount = usePurgeAccount();

  async function trocarSenha() {
    if (novaSenha.length < 6) return toast.error("Nova senha deve ter no mínimo 6 caracteres.");
    if (novaSenha !== confirmar) return toast.error("Confirmação não confere.");
    try {
      await updatePassword.mutateAsync(novaSenha);
      toast.success("Senha alterada");
      setNovaSenha(""); setConfirmar("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao trocar senha");
    }
  }

  async function apagarConta() {
    if (!user) return;
    await purgeAccount.mutateAsync(user.id);
    toast.success("Dados apagados. Saindo...");
    await signOut();
    navigate({ to: "/auth" });
  }

  async function sair() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader title="Configurações" description="Preferências, segurança e dados da conta." icon={Settings} />

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Preferências</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Notificações</Label><p className="text-xs text-muted-foreground">Receber lembretes diários de estudo.</p></div>
            <Switch checked={prefs.notificacoes} onCheckedChange={(v) => setPrefs({ ...prefs, notificacoes: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="flex items-center gap-2"><Moon className="h-4 w-4" /> Tema escuro</Label><p className="text-xs text-muted-foreground">Visual premium para uso noturno.</p></div>
            <Switch checked={prefs.escuro} onCheckedChange={(v) => setPrefs({ ...prefs, escuro: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>Som ao final de pomodoro</Label><p className="text-xs text-muted-foreground">Alerta sonoro ao encerrar sessões.</p></div>
            <Switch checked={prefs.somPomodoro} onCheckedChange={(v) => setPrefs({ ...prefs, somPomodoro: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label className="text-xs">Nova senha</Label><Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></div>
            <div><Label className="text-xs">Confirmar</Label><Input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={trocarSenha}>Trocar senha</Button>
            <Button onClick={sair} variant="outline"><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-destructive"><AlertTriangle className="h-4 w-4" /> Zona de perigo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">Zerar todos os dados</p>
              <p className="text-xs text-muted-foreground">Apaga registros, questões, eventos e sessões da sua conta. Irreversível.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive">Zerar tudo</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os seus dados serão removidos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { void apagarConta(); }}>Sim, apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
