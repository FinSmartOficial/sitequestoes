import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";

/**
 * Client-side function middleware that attaches the current Supabase
 * access token as `Authorization: Bearer <token>` to outbound server
 * function calls. No-op on the server and when there's no session.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    if (typeof window === "undefined") {
      return next();
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return next();
      return next({
        sendContext: {},
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return next();
    }
  });
