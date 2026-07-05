import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import * as authApi from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — FinSmart Tec" },
      { name: "description", content: "Acesse sua conta FinSmart Tec para estudar com questões, simulados, rankings e ciclo inteligente." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect away if already signed in
  useEffect(() => {
    void authApi.getSession().then((s) => {
      if (s) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authApi.signInWithPassword(email, password);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    await navigate({ to: "/", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authApi.signUpWithPassword(email, password, {
      nome: nome || email.split("@")[0],
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail se necessário.");
    setTab("signin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">FinSmart Tec</h1>
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-in">E-mail</Label>
                    <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-in">Senha</Label>
                    <Input id="pass-in" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome-up">Nome</Label>
                    <Input id="nome-up" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">E-mail</Label>
                    <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-up">Senha</Label>
                    <Input id="pass-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Voltar para <Link to="/" className="underline">o site</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
