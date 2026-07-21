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
    // dashboard. Idempotent and deduped, so it's safe alongside useWallet's
    // own call to the same ensureWalletReady().
    const maybeProvision = (session: Session | null) => {
      if (session?.user) {
        portalApi.ensureWalletReady().catch((e) =>
          console.error("Background wallet provisioning failed:", e)
        );
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        maybeProvision(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      maybeProvision(session);
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
