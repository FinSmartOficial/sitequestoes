import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { admin } from "@/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/configuracoes")({
  component: AdminConfig,
});

type ConfigRow = admin.AdminConfigRow;

function AdminConfig() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const r = await admin.listAdminConfigs();
    setRows(r);
    setValues(Object.fromEntries(r.map((x) => [x.chave, JSON.stringify(x.valor)])));
    setLoading(false);
  }

  async function save(chave: string) {
    setSaving(chave);
    try {
      const raw = values[chave];
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
      await admin.setAdminConfig(chave, parsed);
      toast.success("Configuração salva");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const grouped = rows.reduce<Record<string, ConfigRow[]>>((acc, r) => {
    (acc[r.categoria] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base capitalize">
              <SettingsIcon className="h-4 w-4 text-primary" />
              {cat}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((r) => {
              const isBool = typeof r.valor === "boolean";
              return (
                <div key={r.chave} className="grid gap-2 rounded-lg border border-border/40 bg-background/40 p-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <Label className="font-mono text-xs text-primary">{r.chave}</Label>
                    {r.descricao && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.descricao}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {isBool ? (
                        <Switch
                          checked={values[r.chave] === "true"}
                          onCheckedChange={(v) =>
                            setValues((s) => ({ ...s, [r.chave]: v ? "true" : "false" }))
                          }
                        />
                      ) : (
                        <Input
                          value={values[r.chave] ?? ""}
                          onChange={(e) =>
                            setValues((s) => ({ ...s, [r.chave]: e.target.value }))
                          }
                          className="max-w-sm font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => save(r.chave)}
                    disabled={saving === r.chave}
                    className="self-end"
                  >
                    {saving === r.chave ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
