import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import { getSession } from "@/api/auth";

export const Route = createFileRoute("/_app")({
  // Auth lives in localStorage; only the client can know if the user is signed in.
  ssr: false,
  beforeLoad: async () => {
    if (await getSession()) return;

    // Dá uma pequena tolerância para o Supabase restaurar a sessão do storage
    // em reloads frios, evitando flash/redirect indevido para /auth.
    await new Promise((resolve) => setTimeout(resolve, 75));
    if (!(await getSession())) {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <MainLayout>
      <Outlet />
    </MainLayout>
  ),
});
