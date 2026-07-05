/**
 * Fachada da camada de acesso ao backend — Fase 13.
 * Todo componente/hook do frontend deve importar daqui.
 * Nenhum arquivo fora de `src/api/` deve chamar `supabase.rpc` ou `supabase.from`
 * quando existir função equivalente nesta camada.
 */
export * as auth from "./auth";
export * as profile from "./profile";
export * as dashboard from "./dashboard";
export * as questions from "./questions";
export * as notebooks from "./notebooks";
export * as review from "./review";
export * as plans from "./plans";
export * as answers from "./answers";
export * as gamification from "./gamification";
export * as xp from "./xp";
export * as rankings from "./rankings";
export * as friends from "./friends";
export * as notifications from "./notifications";
export * as arena from "./arena";
export * as simulations from "./simulations";
export * as studyCycle from "./studyCycle";
export * as exams from "./exams";
export * as stats from "./stats";
export * as performance from "./performance";
export * as recommendations from "./recommendations";
export * as explanations from "./explanations";
export * as history from "./history";
export * as calendar from "./calendar";
export * as timer from "./timer";
export * as settings from "./settings";
export * as admin from "./admin";
export * as ai from "./ai";
export * as questionEngine from "./questionEngine";
export * as reviews from "./reviews";
export * as missions from "./missions";
export { qk } from "./keys";
export * from "./hooks";
