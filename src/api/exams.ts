/**
 * Camada oficial do domínio Editais — Fase 14D.
 * Toda comunicação com o backend (RPCs, tabelas, storage) deve passar por este módulo.
 */
import { supabase } from "@/lib/supabase";

// ============= DTOs =============

export interface ExamDTO {
  id: string;
  nome: string;
  orgao: string | null;
  cargo: string | null;
  banca: string | null;
  ano: number | null;
  estado: string | null;
  cidade: string | null;
  area: string | null;
  escolaridade: string | null;
  nivel: string | null;
  tipo_prova: string | null;
  etapas: string | null;
  local_prova: string | null;
  observacoes: string | null;
  remuneracao: number | null;
  carga_horaria: string | null;
  vagas: number | null;
  cadastro_reserva: boolean | null;
  situacao: string | null;
  status: string;
  data_publicacao: string | null;
  data_prova: string | null;
  inscricoes_inicio: string | null;
  inscricoes_fim: string | null;
  valor_inscricao: number | null;
  link_oficial: string | null;
  capa_url: string | null;
  descricao: string | null;
  created_at: string;
}

export interface ExamDisciplineDTO {
  id: string;
  edital_id: string;
  nome: string;
  peso: number;
  qtd_questoes: number;
  percentual: number | null;
  obrigatoria: boolean;
  ordem: number;
}

export interface ExamProgressSummary {
  total: number;
  concluidas: number;
  em_andamento: number;
  nao_iniciadas: number;
  questoes_total: number;
}

export interface ExamProgress {
  edital: ExamDTO;
  disciplinas: (ExamDisciplineDTO & { status: string })[];
  resumo: ExamProgressSummary;
  percentual: number;
}

export interface DailyExamGoal {
  edital?: string;
  minutos_total?: number;
  itens: {
    disciplina_id: string;
    disciplina: string;
    minutos: number;
    status: string;
  }[];
}

// ============= Queries =============

export async function listActiveExams(): Promise<ExamDTO[]> {
  const { data, error } = await supabase
    .from("editais")
    .select("*")
    .eq("status", "ativo")
    .order("data_prova", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ExamDTO[];
}

export async function listAllExams(): Promise<ExamDTO[]> {
  const { data, error } = await supabase
    .from("editais")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExamDTO[];
}

export interface MyExamsState {
  principalId: string | null;
  favoritos: string[];
}

export async function getMyExams(userId: string): Promise<MyExamsState> {
  const { data, error } = await supabase
    .from("user_editais")
    .select("edital_id, principal, favorito")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    edital_id: string;
    principal: boolean;
    favorito: boolean;
  }>;
  return {
    principalId: rows.find((r) => r.principal)?.edital_id ?? null,
    favoritos: rows.filter((r) => r.favorito).map((r) => r.edital_id),
  };
}

export async function getExamProgress(
  editalId: string | null | undefined,
): Promise<ExamProgress | null> {
  const { data, error } = await supabase.rpc("edital_progresso", {
    p_edital: editalId ?? null,
  });
  if (error) throw error;
  return (data as ExamProgress) ?? null;
}

export async function getDailyGoal(minutos = 60): Promise<DailyExamGoal> {
  const { data, error } = await supabase.rpc("edital_meta_hoje", {
    p_minutos: minutos,
  });
  if (error) throw error;
  return (data as DailyExamGoal) ?? { itens: [] };
}

export async function listExamDisciplines(
  editalId: string,
): Promise<ExamDisciplineDTO[]> {
  const { data, error } = await supabase
    .from("edital_disciplinas")
    .select("*")
    .eq("edital_id", editalId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExamDisciplineDTO[];
}

// ============= Mutations (user-side) =============

export async function selectMainExam(editalId: string): Promise<void> {
  const { error } = await supabase.rpc("edital_selecionar_principal", {
    p_edital: editalId,
  });
  if (error) throw error;
}

export async function favoriteExam(
  editalId: string,
  fav: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("edital_favoritar", {
    p_edital: editalId,
    p_fav: fav,
  });
  if (error) throw error;
}

export async function setDisciplineStatus(
  disciplinaId: string,
  status: string,
): Promise<void> {
  const { error } = await supabase.rpc("edital_definir_status_disciplina", {
    p_disciplina: disciplinaId,
    p_status: status,
  });
  if (error) throw error;
}

// ============= Mutations (admin-side) =============

export async function upsertExam(
  form: Partial<ExamDTO> & { id?: string },
): Promise<void> {
  const payload = { ...form, updated_at: new Date().toISOString() };
  const { error } = form.id
    ? await supabase.from("editais").update(payload).eq("id", form.id)
    : await supabase.from("editais").insert(payload);
  if (error) throw error;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from("editais").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateExam(exam: ExamDTO): Promise<void> {
  const { id: _id, created_at: _c, ...rest } = exam;
  const { error } = await supabase
    .from("editais")
    .insert({ ...rest, nome: `${exam.nome} (cópia)` });
  if (error) throw error;
}

export async function toggleArchiveExam(exam: ExamDTO): Promise<void> {
  const novo = exam.status === "arquivado" ? "ativo" : "arquivado";
  const { error } = await supabase
    .from("editais")
    .update({ status: novo })
    .eq("id", exam.id);
  if (error) throw error;
}

export async function addExamDiscipline(input: {
  edital_id: string;
  nome: string;
  peso: number;
  qtd_questoes: number;
  ordem: number;
}): Promise<void> {
  const { error } = await supabase.from("edital_disciplinas").insert({
    edital_id: input.edital_id,
    nome: input.nome,
    peso: input.peso,
    qtd_questoes: input.qtd_questoes,
    obrigatoria: true,
    ordem: input.ordem,
  });
  if (error) throw error;
}

export async function removeExamDiscipline(id: string): Promise<void> {
  const { error } = await supabase.from("edital_disciplinas").delete().eq("id", id);
  if (error) throw error;
}

// ============= Storage (capa) =============

export async function uploadExamCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("editais")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data: signed, error: sErr } = await supabase.storage
    .from("editais")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 anos
  if (sErr) throw sErr;
  return signed.signedUrl;
}
