import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/perfil/$username")({
  component: () => <div className="p-10 text-center text-xl">Perfil em manutenção temporária.</div>,
});
