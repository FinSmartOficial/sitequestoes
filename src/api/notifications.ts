/**
 * Camada de acesso — Notificações.
 * Concentra fontes usadas hoje pelo sino de notificações do app.
 * Nota: o backend ainda não expõe uma tabela `notifications` consumível
 * por este módulo; por enquanto o sino agrega pedidos de amizade
 * (via `friends.ts`) e a contagem de denúncias abertas para admins.
 */
import { supabase } from "@/lib/supabase";

export interface AdminAlertsDTO {
  denunciasAbertas: number;
}

interface QqEstatisticasRow {
  denuncias_abertas?: number | null;
}

export async function fetchAdminAlerts(): Promise<AdminAlertsDTO> {
  const { data, error } = await supabase.rpc("qq_estatisticas");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as QqEstatisticasRow | null;
  return { denunciasAbertas: Number(row?.denuncias_abertas ?? 0) };
}
