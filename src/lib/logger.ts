/**
 * Minimal logger wrapper. Centraliza chamadas para facilitar troca futura
 * (Sentry, Logtail, etc.). Mantém a mesma assinatura do console.
 */
export const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
