import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useUpdateMyProfile } from "@/api/hooks";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileXP } from "@/components/profile/ProfileXP";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileAchievements } from "@/components/profile/ProfileAchievements";
import { ProfileHistory } from "@/components/profile/ProfileHistory";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { ProfileFriends } from "@/components/profile/ProfileFriends";
import { XpProgressCard } from "@/components/xp/XpProgressCard";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — FinSmart Tec" },
      { name: "description", content: "Seu perfil, conquistas, XP e estatísticas." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const profileQ = useMyProfile();
  const update = useUpdateMyProfile();
  const [editOpen, setEditOpen] = useState(false);

  if (authLoading || profileQ.isLoading) {
    return <div className="p-4 sm:p-6"><ProfileSkeleton /></div>;
  }
  if (!user) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Entre na sua conta para acessar o perfil.</div>;
  }

  const profile = profileQ.data;
  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Não foi possível carregar o perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profileQ.error instanceof Error ? profileQ.error.message : "Recarregue a página ou tente novamente."}
        </p>
        <button
          type="button"
          onClick={() => void profileQ.refetch()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <ProfileHeader
        profile={profile}
        isOwner
        onUpdate={async (patch) => {
          try {
            await update.mutateAsync(patch);
            return { error: null };
          } catch (e) {
            return { error: e as Error };
          }
        }}
        onEditClick={() => setEditOpen(true)}
      />
      <XpProgressCard />
      <ProfileXP />
      <ProfileStats userId={profile.id} />
      <ProfileFriends userId={profile.id} />
      <ProfileAchievements />
      <ProfileHistory userId={profile.id} />
      <ProfileSettings
        profile={profile}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={async (patch) => {
          try {
            await update.mutateAsync(patch);
            return { error: null };
          } catch (e) {
            return { error: e as Error };
          }
        }}
      />
    </div>
  );
}
