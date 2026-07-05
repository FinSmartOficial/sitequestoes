import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { logger } from "./lib/logger";

/**
 * Defaults padronizados de React Query — Fase 17.
 * - staleTime 30s: reduz refetch em navegação rápida sem quebrar frescor.
 * - gcTime 5min: mantém cache para back/forward instantâneo.
 * - retry 2 com backoff exponencial (máx 10s).
 * - refetchOnWindowFocus desabilitado (evita renders desnecessários).
 * - refetchOnReconnect habilitado (recupera dados após reconexão).
 * Hooks específicos podem sobrescrever conforme necessário.
 */
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
        onError: (err) => logger.error("mutation.error", err),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
