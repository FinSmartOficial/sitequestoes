import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isReady: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    async function initializeAuth() {
      const { supabase } = await import("../lib/supabase");
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      setSession(data.session ?? null);
      setIsReady(true);

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession ?? null);
      });

      cleanup = () => listener.subscription.unsubscribe();
    }

    void initializeAuth().catch(() => {
      if (active) setIsReady(true);
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isReady,
      loading: !isReady,
    }),
    [isReady, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}