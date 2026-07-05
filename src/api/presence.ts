/**
 * Presença global — encapsula o canal Realtime `presence:global`.
 * Fase 15: única fonte para tracking de status de usuários online.
 */
import { supabase } from "@/lib/supabase";

export type PresenceStatus = "online" | "in_match" | "studying" | "offline";

interface PresenceMeta {
  user_id: string;
  status: PresenceStatus;
  online_at: string;
}

export function subscribeGlobalPresence(
  userId: string,
  status: PresenceStatus,
  onSync: (map: Record<string, PresenceStatus>) => void,
): () => void {
  const channel = supabase.channel("presence:global", {
    config: { presence: { key: userId } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceMeta>();
      const next: Record<string, PresenceStatus> = {};
      for (const key of Object.keys(state)) {
        const meta = state[key]?.[0];
        if (meta) next[key] = meta.status ?? "online";
      }
      onSync(next);
    })
    .subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await channel.track({ user_id: userId, status, online_at: new Date().toISOString() });
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
