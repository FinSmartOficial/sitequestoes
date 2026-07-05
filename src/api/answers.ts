/**
 * Camada de Respostas — Fase 13 / Turno 2.
 *
 * Reexporta `recordAnswer` como ÚNICA forma permitida de registrar respostas
 * a partir do frontend. Inserções diretas em `answers` são proibidas por
 * este turno em diante (o RPC dispara os triggers de analytics/SRS/gamificação).
 */
export { recordAnswer } from "./questions";
export type { RecordAnswerInput, RecordAnswerResult, AnswerOrigin } from "./questions";
