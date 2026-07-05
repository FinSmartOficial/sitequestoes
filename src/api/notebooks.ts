/**
 * Camada de Cadernos — Fase 13A.
 * Consome exclusivamente RPCs oficiais `notebook_*`.
 * Acesso direto às tabelas `notebooks` / `notebook_questions` foi eliminado.
 */
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";

export type NotebookRow = Database["public"]["Tables"]["notebooks"]["Row"];

export interface NotebookQuestionItem {
  notebook_question_id: string;
  position: number;
  added_at: string;
  question: Record<string, unknown> & { id: string; alternatives: unknown[] };
}

export interface NotebookQuestionsPage {
  total: number;
  page: number;
  page_size: number;
  items: NotebookQuestionItem[];
}

export async function listNotebooks(opts: { includeArchived?: boolean } = {}): Promise<NotebookRow[]> {
  const { data, error } = await supabase.rpc("notebook_list", {
    _include_archived: opts.includeArchived ?? false,
  });
  if (error) throw error;
  return (data ?? []) as NotebookRow[];
}

export async function getNotebook(id: string): Promise<NotebookRow> {
  const { data, error } = await supabase.rpc("notebook_get", { _id: id });
  if (error) throw error;
  return data as NotebookRow;
}

export async function createNotebook(input: {
  name: string;
  description?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<NotebookRow> {
  const { data, error } = await supabase.rpc("notebook_create", {
    _name: input.name,
    _description: input.description ?? null,
    _color: input.color ?? null,
    _metadata: (input.metadata ?? {}) as never,
  });
  if (error) throw error;
  return data as NotebookRow;
}

export async function updateNotebook(
  id: string,
  patch: {
    name?: string | null;
    description?: string | null;
    color?: string | null;
    is_archived?: boolean | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<NotebookRow> {
  const { data, error } = await supabase.rpc("notebook_update", {
    _id: id,
    _name: patch.name ?? null,
    _description: patch.description ?? null,
    _color: patch.color ?? null,
    _is_archived: patch.is_archived ?? null,
    _metadata: (patch.metadata ?? null) as never,
  });
  if (error) throw error;
  return data as NotebookRow;
}

export async function deleteNotebook(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("notebook_delete", { _id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function addQuestionToNotebook(notebookId: string, questionId: string): Promise<void> {
  const { error } = await supabase.rpc("notebook_add_question", {
    _notebook_id: notebookId,
    _question_id: questionId,
  });
  if (error) throw error;
}

export async function removeQuestionFromNotebook(notebookId: string, questionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("notebook_remove_question", {
    _notebook_id: notebookId,
    _question_id: questionId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function listNotebookQuestions(
  notebookId: string,
  page = 1,
  pageSize = 20,
): Promise<NotebookQuestionsPage> {
  const { data, error } = await supabase.rpc("notebook_questions_paginated", {
    _notebook_id: notebookId,
    _page: page,
    _page_size: pageSize,
  });
  if (error) throw error;
  const src = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(src.total ?? 0),
    page: Number(src.page ?? page),
    page_size: Number(src.page_size ?? pageSize),
    items: (src.items ?? []) as NotebookQuestionItem[],
  };
}
