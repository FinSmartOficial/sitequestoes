import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Search, Loader2, RefreshCw, Archive, CheckCircle2, AlertTriangle, History, Eye, Zap, StopCircle, FileText, Save, Wand2, Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { admin } from "@/api";
import { gerarExplicacao } from "@/lib/gerar-explicacao.functions";
import { toast } from "sonner";
import { ExplicacaoQuestao } from "@/components/explicacoes/ExplicacaoQuestao";
import { cn } from "@/lib/utils";
import type { ExplicacaoConteudo } from "@/api/explanations";

function limparEnunciado(texto: string): string {
  return (texto ?? "").replace(/^\s*\(?\s*Item\s*\d+\s*\/\s*\d+\s*\)?\s*[-–—:.]?\s*/i, "");
}

export const Route = createFileRoute("/_app/admin/explicacoes")({
  head: () => ({ meta: [{ title: "Explicações — Admin FinSmart Tec" }] }),
  component: AdminExplicacoesPage,
});

interface Row {
  id: string; questao_id: string; versao: number; status: string;
  materia: string; banca: string | null; enunciado: string;
  curtidas: number; descurtidas: number; denuncias: number; updated_at: string;
}
interface Stats {
  total_versoes: number; total_ativas: number; em_revisao: number;
  questoes_com_explicacao: number; questoes_totais: number;
  curtidas_totais: number; descurtidas_totais: number; denuncias_totais: number;
}
interface VersaoResumo { id: string; status: string }
interface QuestaoPendenteIa { id: string; explicacoes_versoes?: VersaoResumo[] | null }
interface QuestaoBanco {
  id: string;
  materia: string;
  topico: string | null;
  banca: string | null;
  tipo: "CE" | "MULTIPLA";
  enunciado: string;
  alternativas: unknown;
  gabarito_ce: boolean | null;
  gabarito_idx: number | null;
  comentario: string | null;
  explicacoes_versoes?: VersaoResumo[] | null;
}

function letra(i: number) {
  return String.fromCharCode(65 + i);
}

function normalizarTermoBusca(termo: string) {
  return termo.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizarAlternativas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function respostaCorreta(q: QuestaoBanco) {
  if (q.tipo === "CE") return q.gabarito_ce ? "CERTO" : "ERRADO";
  return `Alternativa ${letra(q.gabarito_idx ?? 0)}`;
}

function textoExplicacaoBase(q: QuestaoBanco, textoManual: string) {
  const texto = textoManual.trim() || q.comentario?.trim();
  if (texto) return texto;
  return `Gabarito oficial: ${respostaCorreta(q)}. Esta explicação foi criada como versão base para liberar o estudo da questão enquanto uma análise professoral completa não é cadastrada.`;
}

function montarConteudoBase(q: QuestaoBanco, textoManual: string): ExplicacaoConteudo {
  const texto = textoExplicacaoBase(q, textoManual);
  const topico = q.topico ? ` sobre ${q.topico}` : "";
  const alternativas = q.tipo === "CE"
    ? [
        { letra: "C", correta: q.gabarito_ce === true, analise: q.gabarito_ce === true ? texto : "O item está incorreto conforme o gabarito oficial." },
        { letra: "E", correta: q.gabarito_ce === false, analise: q.gabarito_ce === false ? texto : "O item está correto conforme o gabarito oficial." },
      ]
    : normalizarAlternativas(q.alternativas).map((alternativa, index) => ({
        letra: letra(index),
        correta: index === (q.gabarito_idx ?? -1),
        analise: index === (q.gabarito_idx ?? -1)
          ? texto
          : `Alternativa incorreta segundo o gabarito oficial. Texto da alternativa: ${alternativa}`,
      }));

  return {
    resposta_correta: respostaCorreta(q),
    resumo: texto,
    explicacao_completa: texto,
    alternativas,
    pegadinha: "Revise o enunciado com atenção e compare cada afirmação com o gabarito oficial.",
    fundamentacao: q.comentario?.trim() || "Fundamentação a complementar pelo professor.",
    resumo_memorizar: `${q.materia}${topico}: gabarito ${respostaCorreta(q)}.`,
    macete: "Identifique a palavra-chave do enunciado e confronte com a regra cobrada.",
    assuntos_relacionados: [q.materia, q.topico].filter((item): item is string => Boolean(item)),
    dificuldade: "medio",
    dificuldade_justificativa: "Classificação inicial atribuída automaticamente pela curadoria.",
    competencias: [q.materia],
    erros_comuns: "Marcar a resposta sem separar fato, regra e exceção do enunciado.",
    tempo_medio_segundos: 90,
    comentario_professor: textoManual.trim() ? "Explicação cadastrada manualmente no painel administrativo." : undefined,
  };
}

async function gerarHashConteudo(conteudo: ExplicacaoConteudo) {
  const bytes = new TextEncoder().encode(JSON.stringify(conteudo));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Extrai uma seção nomeada até a próxima seção conhecida
const SECTION_NAMES = [
  "RESPOSTA CORRETA", "RESUMO", "EXPLICAÇÃO COMPLETA", "EXPLICACAO COMPLETA",
  "ANÁLISE DAS ALTERNATIVAS", "ANALISE DAS ALTERNATIVAS",
  "PEGADINHA", "FUNDAMENTAÇÃO", "FUNDAMENTACAO",
  "RESUMO PARA MEMORIZAR", "MACETE",
  "ASSUNTOS RELACIONADOS", "DIFICULDADE",
  "COMPETÊNCIAS AVALIADAS", "COMPETENCIAS AVALIADAS",
  "ERROS MAIS COMUNS", "TEMPO MÉDIO", "TEMPO MEDIO",
];

function extrairSecao(texto: string, nome: string): string {
  const escaped = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const outras = SECTION_NAMES.filter((n) => n !== nome).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`^\\s*${escaped}\\s*:\\s*([\\s\\S]*?)(?=^\\s*(?:${outras})\\s*:|$(?![\\s\\S]))`, "im");
  return (texto.match(re)?.[1] ?? "").trim();
}
function primeiraSecao(texto: string, nomes: string[]): string {
  for (const n of nomes) { const v = extrairSecao(texto, n); if (v) return v; }
  return "";
}

function parseRespostaProfessor(texto: string, q: QuestaoBanco): ExplicacaoConteudo | null {
  // precisa ter pelo menos a explicação completa para valer como "rica"
  const explicacao = primeiraSecao(texto, ["EXPLICAÇÃO COMPLETA", "EXPLICACAO COMPLETA"]);
  if (!explicacao) return null;

  const respostaSec = primeiraSecao(texto, ["RESPOSTA CORRETA"]) || respostaCorreta(q);
  const resumo = primeiraSecao(texto, ["RESUMO"]) || explicacao.split("\n\n")[0];
  const analiseBloco = primeiraSecao(texto, ["ANÁLISE DAS ALTERNATIVAS", "ANALISE DAS ALTERNATIVAS"]);
  const pegadinha = primeiraSecao(texto, ["PEGADINHA"]);
  const fundamentacao = primeiraSecao(texto, ["FUNDAMENTAÇÃO", "FUNDAMENTACAO"]) || "Fundamentação doutrinária.";
  const resumoMem = primeiraSecao(texto, ["RESUMO PARA MEMORIZAR"]);
  const macete = primeiraSecao(texto, ["MACETE"]);
  const assuntos = primeiraSecao(texto, ["ASSUNTOS RELACIONADOS"])
    .split(/[,;\n]/).map((s) => s.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
  const dificuldadeRaw = primeiraSecao(texto, ["DIFICULDADE"]).toLowerCase();
  const dificuldade: "facil" | "medio" | "dificil" =
    dificuldadeRaw.startsWith("faci") ? "facil"
    : dificuldadeRaw.startsWith("dific") ? "dificil"
    : "medio";
  const difMatch = dificuldadeRaw.match(/[—\-:]\s*(.+)$/);
  const dificuldadeJust = difMatch?.[1]?.trim() || "Classificação atribuída pelo professor.";
  const competencias = primeiraSecao(texto, ["COMPETÊNCIAS AVALIADAS", "COMPETENCIAS AVALIADAS"])
    .split(/[,;\n]/).map((s) => s.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
  const errosComuns = primeiraSecao(texto, ["ERROS MAIS COMUNS"]) || "—";
  const tempoStr = primeiraSecao(texto, ["TEMPO MÉDIO", "TEMPO MEDIO"]);
  const tempo = parseInt(tempoStr.replace(/\D+/g, ""), 10) || 90;

  // Parse "- Letra: Correta|Incorreta — análise"
  const alternativas = q.tipo === "CE"
    ? ["Certo", "Errado"].map((rot) => {
        const re = new RegExp(`^\\s*[-•]?\\s*${rot}\\s*[:\\-—]\\s*(Correta|Incorreta)?\\s*[—\\-:]*\\s*(.*)$`, "im");
        const m = analiseBloco.match(re);
        const correta = rot.toLowerCase() === respostaSec.toLowerCase().trim();
        return { letra: rot === "Certo" ? "C" : "E", correta, analise: (m?.[2] ?? "").trim() || (correta ? "Alternativa correta." : "Alternativa incorreta.") };
      })
    : normalizarAlternativas(q.alternativas).map((_, i) => {
        const L = letra(i);
        const re = new RegExp(`^\\s*[-•]?\\s*${L}\\s*[\\):\\-—]\\s*(Correta|Incorreta)?\\s*[—\\-:]*\\s*(.*)$`, "im");
        const m = analiseBloco.match(re);
        const correta = i === (q.gabarito_idx ?? -1);
        return { letra: L, correta, analise: (m?.[2] ?? "").trim() || (correta ? "Alternativa correta." : "Alternativa incorreta.") };
      });

  return {
    resposta_correta: respostaSec,
    resumo,
    explicacao_completa: explicacao,
    alternativas,
    pegadinha: pegadinha || undefined,
    fundamentacao,
    resumo_memorizar: resumoMem || undefined,
    macete: macete || undefined,
    assuntos_relacionados: assuntos.length ? assuntos : [q.materia],
    dificuldade,
    dificuldade_justificativa: dificuldadeJust,
    competencias: competencias.length ? competencias : [q.materia],
    erros_comuns: errosComuns,
    tempo_medio_segundos: tempo,
    comentario_professor: "Explicação importada em massa via arquivo.",
  };
}

async function salvarExplicacaoBase(q: QuestaoBanco, textoManual: string) {
  const rica = textoManual.trim() ? parseRespostaProfessor(textoManual, q) : null;
  const conteudo = rica ?? montarConteudoBase(q, textoManual);
  const proxima = await admin.proximaVersaoExplicacao(q.id);
  await admin.arquivarVersoesAtivas(q.id);
  await admin.inserirExplicacaoVersao({
    questao_id: q.id,
    versao: proxima,
    status: "ativa",
    conteudo,
    hash: await gerarHashConteudo(conteudo),
    idioma: "pt-BR",
    autor_tipo: textoManual.trim() ? "professor" : "admin",
    modelo_ia: null,
    observacoes: rica ? "Importada em massa com parse estruturado (RESPOSTA/RESUMO/EXPLICAÇÃO/ANÁLISE/…)." : (textoManual.trim() ? "Cadastrada manualmente pelo painel." : "Criada automaticamente a partir do gabarito/comentário existente, sem uso de IA."),
  });
  return proxima;
}


// ----------- Lote em massa: gerar arquivo + parse -----------
function montarArquivoLote(qs: QuestaoBanco[]): string {
  const linhas: string[] = [];
  linhas.push("# LOTE DE QUESTÕES PARA GABARITAR");
  linhas.push(`# Total: ${qs.length} questões sem explicação ativa`);
  linhas.push("#");
  linhas.push("# INSTRUÇÕES:");
  linhas.push("# - Cada questão tem um bloco iniciado por '=== QUESTAO <numero> ==='");
  linhas.push("# - Preencha APENAS o bloco 'RESPOSTA_PROFESSOR:' de cada questão");
  linhas.push("# - Escreva a explicação livremente (texto corrido)");
  linhas.push("# - NÃO altere as linhas 'ID:', '===' nem o cabeçalho");
  linhas.push("# - Depois cole o arquivo inteiro no campo 'Importar em massa'");
  linhas.push("");
  qs.forEach((q, i) => {
    linhas.push(`=== QUESTAO ${String(i + 1).padStart(3, "0")} ===`);
    linhas.push(`ID: ${q.id}`);
    linhas.push(`MATERIA: ${q.materia}${q.topico ? " — " + q.topico : ""}`);
    linhas.push(`BANCA: ${q.banca ?? "—"}`);
    linhas.push(`TIPO: ${q.tipo === "CE" ? "Certo/Errado" : "Múltipla escolha"}`);
    linhas.push("");
    linhas.push("ENUNCIADO:");
    linhas.push(limparEnunciado(q.enunciado));
    linhas.push("");
    if (q.tipo === "CE") {
      linhas.push(`GABARITO OFICIAL: ${q.gabarito_ce ? "CERTO" : "ERRADO"}`);
    } else {
      linhas.push("ALTERNATIVAS:");
      normalizarAlternativas(q.alternativas).forEach((a, j) => linhas.push(`  ${letra(j)}) ${a}`));
      linhas.push(`GABARITO OFICIAL: Alternativa ${letra(q.gabarito_idx ?? 0)}`);
    }
    linhas.push("");
    linhas.push("RESPOSTA_PROFESSOR:");
    linhas.push("<escreva aqui a explicação completa desta questão>");
    linhas.push("");
    linhas.push("=== FIM ===");
    linhas.push("");
  });
  return linhas.join("\n");
}

function baixarArquivo(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface RespostaImportada {
  id: string;
  numero: string;
  texto: string;
}

function parseLoteRespostas(texto: string): { itens: RespostaImportada[]; ignoradas: number } {
  const blocos = texto.split(/^=== QUESTAO\s+/im).slice(1);
  const itens: RespostaImportada[] = [];
  let ignoradas = 0;
  const placeholder = "<escreva aqui a explicação completa desta questão>";
  for (const bloco of blocos) {
    const numero = (bloco.match(/^(\S+)\s*===/)?.[1] ?? "?").trim();
    const id = bloco.match(/^ID:\s*([0-9a-f-]{36})/im)?.[1]?.trim();
    const respMatch = bloco.match(/RESPOSTA_PROFESSOR:[ \t]*\n?([\s\S]*?)(?:^=== FIM ===|^=== QUESTAO |$(?![\s\S]))/im);
    const respTexto = (respMatch?.[1] ?? "").trim();
    if (!id) { ignoradas++; continue; }
    if (!respTexto || respTexto === placeholder) { ignoradas++; continue; }
    itens.push({ id, numero, texto: respTexto });
  }
  return { itens, ignoradas };
}


function AdminExplicacoesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<string>("ativa");
  const [termo, setTermo] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Row | null>(null);
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; ok: number; fail: number }>({ running: false, done: 0, total: 0, ok: 0, fail: 0 });
  const [manualTermo, setManualTermo] = useState("");
  const [manualResultados, setManualResultados] = useState<QuestaoBanco[]>([]);
  const [manualQuestao, setManualQuestao] = useState<QuestaoBanco | null>(null);
  const [manualTexto, setManualTexto] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [importTexto, setImportTexto] = useState("");
  const [importando, setImportando] = useState<{ running: boolean; done: number; total: number; ok: number; fail: number; erros: string[] }>({ running: false, done: 0, total: 0, ok: 0, fail: 0, erros: [] });
  const [baixandoLote, setBaixandoLote] = useState(false);
  const cancelBulk = useRef(false);


  const carregar = useMemo(() => async () => {
    setLoading(true);
    const [list, st] = await Promise.all([
      admin.buscarExplicacoes({
        termo: termo || null,
        status: status === "todas" ? null : status,
        limit: 100,
        offset: 0,
      }),
      admin.estatisticasExplicacoes(),
    ]);
    setRows(list as unknown as Row[]);
    setStats(st as unknown as Stats | null);
    setLoading(false);
  }, [status, termo]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function ativar(id: string) {
    try {
      await admin.ativarVersaoExplicacao(id);
    } catch (e) { return toast.error(e instanceof Error ? e.message : "Falha"); }
    toast.success("Versão ativada");
    void carregar();
  }
  async function marcarRevisao(id: string) {
    try {
      await admin.marcarRevisaoExplicacao(id, "Manual");
    } catch (e) { return toast.error(e instanceof Error ? e.message : "Falha"); }
    toast.success("Marcada para revisão");
    void carregar();
  }
  async function regenerar(questaoId: string) {
    setRegenerandoId(questaoId);
    try {
      await gerarExplicacao({ data: { questao_id: questaoId, forcar: true } });
      toast.success("Nova versão gerada");
      void carregar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha"); }
    finally { setRegenerandoId(null); }
  }

  async function buscarQuestoesManual() {
    const termoLimpo = normalizarTermoBusca(manualTermo);
    if (termoLimpo.length < 3) return toast.error("Digite pelo menos 3 caracteres para buscar.");
    setManualLoading(true);
    try {
      const data = await admin.buscarQuestoesPorTermo<QuestaoBanco>(termoLimpo, 12);
      setManualResultados(data);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setManualLoading(false);
    }
  }

  async function salvarManual() {
    if (!manualQuestao) return;
    if (!manualTexto.trim()) return toast.error("Cole ou escreva a explicação antes de salvar.");
    setManualSaving(true);
    try {
      const versao = await salvarExplicacaoBase(manualQuestao, manualTexto);
      toast.success(`Explicação manual salva como v${versao}`);
      setManualQuestao(null);
      setManualTexto("");
      setManualResultados([]);
      void carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar explicação manual");
    } finally {
      setManualSaving(false);
    }
  }

  async function gerarBaseEmMassa() {
    let qs: QuestaoBanco[];
    try {
      qs = await admin.listarQuestoesComExplicacoes<QuestaoBanco>(5000);
    } catch (e) { return toast.error(e instanceof Error ? e.message : "Falha"); }
    const pendentes = qs
      .filter((q) => !(q.explicacoes_versoes ?? []).some((v) => v.status === "ativa"));
    if (pendentes.length === 0) return toast.success("Todas as questões já possuem explicação ativa.");
    if (!confirm(`Criar explicações base, sem IA, para ${pendentes.length} questões?`)) return;

    cancelBulk.current = false;
    setBulk({ running: true, done: 0, total: pendentes.length, ok: 0, fail: 0 });
    let ok = 0, fail = 0;
    for (const questao of pendentes) {
      if (cancelBulk.current) break;
      try {
        await salvarExplicacaoBase(questao, "");
        ok++;
      } catch {
        fail++;
      }
      setBulk((b) => ({ ...b, done: b.done + 1, ok, fail }));
    }
    setBulk((b) => ({ ...b, running: false }));
    toast.success(`Concluído: ${ok} bases criadas, ${fail} falhas`);
    void carregar();
  }

  async function gerarEmMassaIa() {
    // Busca todas as questões sem explicação ativa
    let qs: QuestaoPendenteIa[];
    try {
      qs = await admin.listarQuestoesIdsComExplicacoes<QuestaoPendenteIa>(5000);
    } catch (e) { return toast.error(e instanceof Error ? e.message : "Falha"); }
    const pendentes = qs
      .filter((q) => !(q.explicacoes_versoes ?? []).some((v) => v.status === "ativa"))
      .map((q) => q.id);
    if (pendentes.length === 0) return toast.success("Todas as questões já possuem explicação ativa.");
    if (!confirm(`Gerar explicações para ${pendentes.length} questões? Isso pode levar alguns minutos e consumir créditos de IA.`)) return;

    cancelBulk.current = false;
    setBulk({ running: true, done: 0, total: pendentes.length, ok: 0, fail: 0 });

    const CONCURRENCY = 1; // rate limit do OpenAI free tier — serial é o único que funciona
    let idx = 0, ok = 0, fail = 0;
    async function worker() {
      while (idx < pendentes.length && !cancelBulk.current) {
        const questaoId = pendentes[idx++];
        try {
          await gerarExplicacao({ data: { questao_id: questaoId } });
          ok++;
        } catch { fail++; }
        setBulk((b) => ({ ...b, done: b.done + 1, ok, fail }));
        // Rate limit do OpenAI (free tier ~ 10 req/min). 6s garante folga.
        await new Promise((r) => setTimeout(r, 6000));
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setBulk((b) => ({ ...b, running: false }));
    toast.success(`Concluído: ${ok} geradas, ${fail} falhas`);
    void carregar();
  }

  async function baixarLotePendentes() {
    setBaixandoLote(true);
    try {
      const data = await admin.listarQuestoesComExplicacoes<QuestaoBanco>(5000);
      const pendentes = data
        .filter((q) => !(q.explicacoes_versoes ?? []).some((v) => v.status === "ativa"))
        .slice(0, 100);
      if (pendentes.length === 0) { toast.success("Nenhuma questão pendente encontrada."); return; }
      const conteudo = montarArquivoLote(pendentes);
      const dataStr = new Date().toISOString().slice(0, 10);
      baixarArquivo(`lote_${pendentes.length}_questoes_${dataStr}.txt`, conteudo);
      toast.success(`Arquivo com ${pendentes.length} questões baixado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar lote");
    } finally {
      setBaixandoLote(false);
    }
  }

  async function importarRespostasEmMassa() {
    const { itens, ignoradas } = parseLoteRespostas(importTexto);
    if (itens.length === 0) {
      return toast.error("Nenhuma resposta preenchida encontrada. Verifique se você não deixou o texto placeholder.");
    }
    if (!confirm(`Importar ${itens.length} respostas${ignoradas ? ` (${ignoradas} ignoradas)` : ""}?`)) return;

    setImportando({ running: true, done: 0, total: itens.length, ok: 0, fail: 0, erros: [] });
    const erros: string[] = [];
    let ok = 0, fail = 0;

    for (const item of itens) {
      try {
        const q = await admin.obterQuestaoPorId<QuestaoBanco>(item.id);
        if (!q) throw new Error("Questão não encontrada");
        await salvarExplicacaoBase(q, item.texto);
        ok++;
      } catch (e) {
        fail++;
        erros.push(`Q${item.numero} (${item.id.slice(0, 8)}): ${e instanceof Error ? e.message : "falha"}`);
      }
      setImportando((s) => ({ ...s, done: s.done + 1, ok, fail, erros }));
    }
    setImportando((s) => ({ ...s, running: false }));
    if (fail === 0) {
      toast.success(`Importadas ${ok} explicações com sucesso.`);
      setImportTexto("");
    } else {
      toast.warning(`Concluído com ${fail} falha(s). ${ok} salvas. Veja detalhes abaixo.`);
    }
    void carregar();
  }


  const cobertura = stats && stats.questoes_totais > 0
    ? Math.round((stats.questoes_com_explicacao / stats.questoes_totais) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explicações Inteligentes"
        description="Auditoria, versionamento e curadoria do Explanation Service."
        icon={Sparkles}
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cobertura" value={`${cobertura}%`} hint={`${stats?.questoes_com_explicacao ?? 0} / ${stats?.questoes_totais ?? 0}`} />
        <Kpi label="Versões ativas" value={stats?.total_ativas ?? 0} hint={`${stats?.total_versoes ?? 0} totais`} />
        <Kpi label="Em revisão" value={stats?.em_revisao ?? 0} tone="warning" />
        <Kpi label="Feedback" value={`👍 ${stats?.curtidas_totais ?? 0} · 👎 ${stats?.descurtidas_totais ?? 0}`} hint={`${stats?.denuncias_totais ?? 0} denúncias`} />
      </div>

      {/* Geração em massa */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" /> Preencher explicações do banco
            </div>
            <p className="text-xs text-muted-foreground">
              Use “Base sem IA” para preencher rápido com gabarito/comentário existente, ou IA apenas quando houver saldo disponível.
            </p>
            {bulk.running && (
              <div className="mt-2 space-y-1">
                <Progress value={bulk.total ? (bulk.done / bulk.total) * 100 : 0} className="h-1.5" />
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {bulk.done}/{bulk.total} · ✅ {bulk.ok} · ⚠️ {bulk.fail}
                </div>
              </div>
            )}
          </div>
          {bulk.running ? (
            <Button size="sm" variant="outline" onClick={() => { cancelBulk.current = true; }} className="gap-1.5">
              <StopCircle className="h-4 w-4" /> Parar
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={gerarBaseEmMassa} className="gap-1.5">
                <FileText className="h-4 w-4" /> Base sem IA
              </Button>
              <Button size="sm" variant="outline" onClick={gerarEmMassaIa} className="gap-1.5">
                <Wand2 className="h-4 w-4" /> Gerar via IA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fluxo em massa por arquivo TXT */}
      <Card className="border-border/60">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="h-4 w-4 text-primary" /> Gabaritar em massa por arquivo
              </div>
              <p className="text-xs text-muted-foreground">
                Baixe um lote de 100 questões pendentes em .txt, preencha o campo <span className="font-mono">RESPOSTA_PROFESSOR:</span> de cada uma e cole o arquivo aqui — o sistema salva cada explicação na questão correta.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void baixarLotePendentes()}
              disabled={baixandoLote}
              className="gap-1.5"
            >
              {baixandoLote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar próximo lote (100)
            </Button>
          </div>

          <Textarea
            value={importTexto}
            onChange={(e) => setImportTexto(e.target.value)}
            rows={10}
            placeholder="Cole aqui o conteúdo completo do arquivo .txt já preenchido…"
            className="font-mono text-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-muted-foreground">
              {importTexto.trim() ? `${importTexto.length.toLocaleString("pt-BR")} caracteres colados` : "Nenhum conteúdo colado ainda."}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void importarRespostasEmMassa()}
              disabled={importando.running || !importTexto.trim()}
              className="gap-1.5"
            >
              {importando.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Importar respostas
            </Button>
          </div>

          {(importando.running || importando.done > 0) && (
            <div className="space-y-1">
              <Progress value={importando.total ? (importando.done / importando.total) * 100 : 0} className="h-1.5" />
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {importando.done}/{importando.total} · ✅ {importando.ok} · ⚠️ {importando.fail}
              </div>
            </div>
          )}

          {importando.erros.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-600 dark:text-amber-400">
              <div className="font-semibold">Falhas:</div>
              <ul className="mt-1 space-y-0.5">
                {importando.erros.slice(0, 10).map((err, i) => (
                  <li key={i} className="font-mono">{err}</li>
                ))}
                {importando.erros.length > 10 && <li>+ {importando.erros.length - 10} outras…</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>



      <Card className="border-border/60">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" /> Cadastrar explicação manual
              </div>
              <p className="text-xs text-muted-foreground">
                Busque uma questão, cole a explicação do professor e salve uma versão ativa sem consumir IA.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-[34rem]">
              <Input
                value={manualTermo}
                onChange={(e) => setManualTermo(e.target.value)}
                placeholder="Buscar questão por enunciado, matéria ou tópico…"
                onKeyDown={(e) => { if (e.key === "Enter") void buscarQuestoesManual(); }}
              />
              <Button type="button" variant="outline" onClick={() => void buscarQuestoesManual()} disabled={manualLoading} className="gap-1.5">
                {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>

          {manualResultados.length > 0 && !manualQuestao && (
            <div className="grid gap-2 md:grid-cols-2">
              {manualResultados.map((q) => {
                const temAtiva = (q.explicacoes_versoes ?? []).some((v) => v.status === "ativa");
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => { setManualQuestao(q); setManualTexto(q.comentario ?? ""); }}
                    className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{q.materia}</Badge>
                      <Badge variant="outline" className="text-[10px]">{respostaCorreta(q)}</Badge>
                      {temAtiva && <Badge variant="outline" className="text-[10px]">já tem ativa</Badge>}
                    </div>
                    <p className="line-clamp-3 text-xs text-foreground/90">{limparEnunciado(q.enunciado)}</p>
                  </button>
                );
              })}
            </div>
          )}

          {manualQuestao && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{manualQuestao.materia}</Badge>
                    <Badge variant="outline" className="text-[10px]">{respostaCorreta(manualQuestao)}</Badge>
                  </div>
                  <p className="text-sm text-foreground/90">{limparEnunciado(manualQuestao.enunciado)}</p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setManualQuestao(null)}>Trocar</Button>
              </div>
              <Textarea
                value={manualTexto}
                onChange={(e) => setManualTexto(e.target.value)}
                rows={8}
                placeholder="Cole aqui a explicação completa do professor…"
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => void salvarManual()} disabled={manualSaving} className="gap-1.5">
                  {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar explicação
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Tabs value={status} onValueChange={setStatus} className="flex-1">
          <TabsList>
            <TabsTrigger value="ativa">Ativas</TabsTrigger>
            <TabsTrigger value="revisao">Em revisão</TabsTrigger>
            <TabsTrigger value="arquivada">Arquivadas</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por enunciado ou conteúdo…" className="pl-9" />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma explicação encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="border-border/60">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{r.materia}</Badge>
                    {r.banca && <Badge variant="outline" className="text-[10px]">{r.banca}</Badge>}
                    <Badge variant="outline" className="text-[10px]">v{r.versao}</Badge>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      👍 {r.curtidas} · 👎 {r.descurtidas}{r.denuncias > 0 && ` · 🚩 ${r.denuncias}`}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-foreground/90">{limparEnunciado(r.enunciado)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Atualizada {new Date(r.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreview(r)}>
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </Button>
                  {r.status !== "ativa" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => ativar(r.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ativar
                    </Button>
                  )}
                  {r.status === "ativa" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => marcarRevisao(r.id)}>
                      <AlertTriangle className="h-3.5 w-3.5" /> Revisão
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => regenerar(r.questao_id)}
                    disabled={regenerandoId === r.questao_id}
                  >
                    {regenerandoId === r.questao_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                    Regenerar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Versão {preview?.versao}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">{limparEnunciado(preview.enunciado)}</div>
              <ExplicacaoQuestao questaoId={preview.questao_id} podeRegenerar />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warning" }) {
  return (
    <Card className={cn("border-border/60", tone === "warning" && "border-amber-500/40 bg-amber-500/5")}>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    ativa:      { label: "Ativa",       className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
    revisao:    { label: "Em revisão",  className: "border-amber-500/40 bg-amber-500/10 text-amber-500",       icon: AlertTriangle },
    rascunho:   { label: "Rascunho",    className: "border-border bg-muted text-muted-foreground",             icon: History },
    rejeitada:  { label: "Rejeitada",   className: "border-rose-500/40 bg-rose-500/10 text-rose-500",          icon: Archive },
    arquivada:  { label: "Arquivada",   className: "border-border bg-muted text-muted-foreground",             icon: Archive },
  };
  const it = map[status] ?? map.arquivada;
  const Icon = it.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", it.className)}>
      <Icon className="h-3 w-3" /> {it.label}
    </Badge>
  );
}
