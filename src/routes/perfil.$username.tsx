import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { getProfileByUsername, updateMyProfile, type ProfileDTO, type ProfilePatch } from "@/api/profile";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileXP } from "@/components/profile/ProfileXP";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileAchievements } from "@/components/profile/ProfileAchievements";
import { ProfileHistory } from "@/components/profile/ProfileHistory";
import { ProfileFriends } from "@/components/profile/ProfileFriends";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { FriendButton } from "@/components/profile/FriendButton";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/api/hooks";

export const Route = createFileRoute("/perfil/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — FinSmart Tec` },
      { name: "description", content: `Perfil público de @${params.username} na FinSmart Tec.` },
      { property: "og:title", content: `@${params.username} — FinSmart Tec` },
      { property: "og:description", content: `Veja o progresso, liga e conquistas de @${params.username}.` },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const ownerQ = useMyProfile();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const p = await getProfileByUsername(username);
        setProfile(p);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao carregar perfil.";
        console.error("[PublicProfile] load failed", err);
        setProfile(null);
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const isOwner = !!user && !!profile && user.id === profile.id;
  const shown: ProfileDTO | null = isOwner && ownerQ.data ? ownerQ.data : profile;

  async function handleUpdate(patch: ProfilePatch): Promise<{ error: Error | null }> {
    if (!user) return { error: new Error("no user") };
    try {
      await updateMyProfile(user.id, patch);
      await ownerQ.refetch();
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }

  if (loading) return <div className="min-h-screen bg-background p-4 sm:p-6"><ProfileSkeleton /></div>;

  if (!shown) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">{loadError ? "Não foi possível carregar o perfil" : "Perfil não encontrado"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadError || `@${username} não existe ou é privado.`}
          </p>
          <Button asChild className="mt-4"><Link to="/">Voltar</Link></Button>
        </div>
      </div>
    );
  }

  if (shown.visibilidade === "privado" && !isOwner) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-bold">Perfil privado</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{shown.username} mantém este perfil oculto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.length > 1 ? window.history.back() : void 0}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar
          </Button>
          {!isOwner && user && <FriendButton meuId={user.id} outroId={shown.id} />}
        </div>
        <ProfileHeader
          profile={shown}
          isOwner={isOwner}
          onUpdate={handleUpdate}
          onEditClick={() => setEditOpen(true)}
        />
        {isOwner && <ProfileXP />}
        <ProfileStats userId={shown.id} />
        <ProfileFriends userId={shown.id} />
        {isOwner && <ProfileAchievements />}
        <ProfileHistory userId={shown.id} />
        {isOwner && (
          <ProfileSettings profile={shown} open={editOpen} onOpenChange={setEditOpen} onSave={handleUpdate} />
        )}
      </div>
    </div>
  );
}
