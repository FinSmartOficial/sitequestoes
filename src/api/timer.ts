/**
 * Timer — camada oficial (Fase 14F).
 * O cronômetro é local (client-side); a persistência de sessões encerradas
 * reaproveita a tabela `sessoes_estudo` via `history.ts`. Este módulo
 * expõe apenas as operações usadas pela UI para não vazar detalhes de
 * armazenamento nos componentes.
 */
import type { NovaSessaoEstudo, SessaoEstudo } from "./history";
import { deleteSessao, insertSessao, listSessoes } from "./history";

export type TimerSessao = SessaoEstudo;
export type NovaTimerSessao = NovaSessaoEstudo;

export const listTimerSessoes = listSessoes;
export const finishTimerSessao = insertSessao;
export const deleteTimerSessao = deleteSessao;
