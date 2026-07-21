import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { portalApi } from "@/lib/portal-api";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fires the moment a session exists — including right after signUp(),
    // before the OTP step even finishes — so the Portal client + wallet are
    // usually already provisioned by the time the person reaches the
    // dashboard. Idempotent and deduped (ensureWalletReady short-circuits
    // after the first successful run), so this is safe alongside useWallet's
    // own call to the same function, and won't re-fire on routine events
    // like TOKEN_REFRESHED once the wallet is confirmed set up.
    const PROVISION_EVENTS = new Set(["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"]);
    const maybeProvision = (event: string, session: Session | null) => {
      if (session?.user && PROVISION_EVENTS.has(event)) {
        portalApi.ensureWalletReady().catch((e) =>
          console.error("Background wallet provisioning failed:", e)
        );
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        maybeProvision(event, session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      maybeProvision("INITIAL_SESSION", session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { name?: string; phone?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: metadata,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return { user, session, loading, signUp, signIn, signOut };
}
