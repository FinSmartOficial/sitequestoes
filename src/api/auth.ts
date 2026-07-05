/**
 * Camada de autenticação — Fase 13.
 * Único ponto do frontend autorizado a chamar `supabase.auth.*`.
 * Componentes e hooks devem usar exclusivamente estas funções.
 */
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthResult {
  error: Error | null;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  meta?: { nome?: string },
): Promise<AuthResult> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: meta?.nome ? { nome: meta.nome } : undefined,
    },
  });
  return { error };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  // Google OAuth via OAuth provider será conectado quando o provider for
  // habilitado (ferramenta configure_social_auth). Enquanto isso, mantemos o
  // ponto único de integração aqui para não espalhar chamadas pelo frontend.
  return { error: new Error("google_provider_not_configured") };
}

export async function resetPasswordForEmail(email: string): Promise<AuthResult> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_evt, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
