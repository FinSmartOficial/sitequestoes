/**
 * Camada de acesso — Amizades.
 * Encapsula todos os acessos à tabela `amizades`, ao RPC `buscar_perfis`
 * e às consultas ao view `profiles_public` relativas ao domínio social.
 * Nenhum componente/tela deve consultar essas fontes diretamente.
 */
import { supabase } from "@/lib/supabase";

export type AmizadeStatus = "pending" | "accepted" | "declined" | "blocked";

export interface AmizadeDTO {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: AmizadeStatus;
  created_at: string;
}

export interface PerfilMiniDTO {
  id: string;
  username: string | null;
  nome: string | null;
  sobrenome?: string | null;
  avatar_url: string | null;
  liga: string;
  nivel: number;
}

export type RelacaoEstado =
  | "self"
  | "none"
  | "pending_out"
  | "pending_in"
  | "friends"
  | "blocked";

export interface RelacaoDTO {
  estado: RelacaoEstado;
  amizadeId: string | null;
}

export interface PedidoPendenteDTO extends AmizadeDTO {
  perfil: PerfilMiniDTO | null;
}

const PROFILE_COLS = "id,username,nome,avatar_url,liga,nivel";

async function fetchPerfis(ids: string[]): Promise<Record<string, PerfilMiniDTO>> {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("profiles_public")
    .select(PROFILE_COLS)
    .in("id", ids);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as PerfilMiniDTO[]).map((p) => [p.id, p]));
}

// ---------------- Consultas ----------------

export async function getRelacao(meuId: string, outroId: string): Promise<RelacaoDTO> {
  if (meuId === outroId) return { estado: "self", amizadeId: null };
  const { data, error } = await supabase
    .from("amizades")
    .select("id,requester_id,addressee_id,status")
    .or(
      `and(requester_id.eq.${meuId},addressee_id.eq.${outroId}),and(requester_id.eq.${outroId},addressee_id.eq.${meuId})`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return { estado: "none", amizadeId: null };
  const status = data.status as AmizadeStatus;
  let estado: RelacaoEstado = "none";
  if (status === "accepted") estado = "friends";
  else if (status === "blocked") estado = "blocked";
  else if (status === "pending") estado = data.requester_id === meuId ? "pending_out" : "pending_in";
  return { estado, amizadeId: data.id };
}

export async function listPedidosPendentes(meuId: string): Promise<PedidoPendenteDTO[]> {
  const { data, error } = await supabase
    .from("amizades")
    .select("id,requester_id,addressee_id,status,created_at")
    .eq("addressee_id", meuId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as AmizadeDTO[];
  const perfis = await fetchPerfis(rows.map((r) => r.requester_id));
  return rows.map((r) => ({ ...r, perfil: perfis[r.requester_id] ?? null }));
}

export async function listAmigos(meuId: string): Promise<PerfilMiniDTO[]> {
  const { data, error } = await supabase
    .from("amizades")
    .select("requester_id,addressee_id,status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${meuId},addressee_id.eq.${meuId}`);
  if (error) throw error;
  const ids = (data ?? []).map((a) => (a.requester_id === meuId ? a.addressee_id : a.requester_id));
  if (!ids.length) return [];
  const { data: ps, error: e2 } = await supabase
    .from("profiles_public")
    .select(PROFILE_COLS)
    .in("id", ids);
  if (e2) throw e2;
  return (ps ?? []) as PerfilMiniDTO[];
}

export async function listBloqueados(meuId: string): Promise<PerfilMiniDTO[]> {
  const { data, error } = await supabase
    .from("amizades")
    .select("addressee_id,requester_id,status")
    .eq("status", "blocked")
    .eq("requester_id", meuId);
  if (error) throw error;
  const ids = (data ?? []).map((a) => a.addressee_id);
  if (!ids.length) return [];
  const { data: ps, error: e2 } = await supabase
    .from("profiles_public")
    .select(PROFILE_COLS)
    .in("id", ids);
  if (e2) throw e2;
  return (ps ?? []) as PerfilMiniDTO[];
}

export async function searchProfiles(q: string): Promise<PerfilMiniDTO[]> {
  const query = q.trim();
  if (!query) return [];
  const { data, error } = await supabase.rpc("buscar_perfis", { _q: query });
  if (error) throw error;
  return (data ?? []) as PerfilMiniDTO[];
}

// ---------------- Mutations ----------------

export async function enviarPedido(meuId: string, outroId: string): Promise<void> {
  const { error } = await supabase
    .from("amizades")
    .insert({ requester_id: meuId, addressee_id: outroId, status: "pending" });
  if (error) throw error;
}

export async function aceitarPedido(amizadeId: string): Promise<void> {
  const { error } = await supabase
    .from("amizades")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", amizadeId);
  if (error) throw error;
}

export async function recusarPedido(amizadeId: string): Promise<void> {
  const { error } = await supabase.from("amizades").delete().eq("id", amizadeId);
  if (error) throw error;
}

export async function removerAmizade(meuId: string, outroId: string): Promise<void> {
  const { error } = await supabase
    .from("amizades")
    .delete()
    .or(
      `and(requester_id.eq.${meuId},addressee_id.eq.${outroId}),and(requester_id.eq.${outroId},addressee_id.eq.${meuId})`,
    );
  if (error) throw error;
}

export async function bloquear(meuId: string, outroId: string): Promise<void> {
  await removerAmizade(meuId, outroId);
  const { error } = await supabase
    .from("amizades")
    .insert({ requester_id: meuId, addressee_id: outroId, status: "blocked" });
  if (error) throw error;
}

export async function desbloquear(meuId: string, outroId: string): Promise<void> {
  const { error } = await supabase
    .from("amizades")
    .delete()
    .eq("requester_id", meuId)
    .eq("addressee_id", outroId)
    .eq("status", "blocked");
  if (error) throw error;
}

// ---------------- Realtime ----------------

/**
 * Assinatura postgres_changes para a caixa de pedidos do usuário atual.
 * Retorna a função de cleanup.
 */
export function subscribePedidosPendentes(meuId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`amizades-${meuId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "amizades", filter: `addressee_id=eq.${meuId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
