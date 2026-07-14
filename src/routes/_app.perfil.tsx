import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/perfil")({
  component: () => <div className="p-10 text-center text-xl">Perfil em manutenção temporária.</div>,
});
