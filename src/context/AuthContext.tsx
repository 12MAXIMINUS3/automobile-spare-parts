import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseEnabled, supabase } from "../lib/supabase";

interface Auth {
  user: User | null;
  session: Session | null;
  /** True once the initial session check (and anonymous sign-in) has settled. */
  ready: boolean;
  /** Anonymous visitors get a real uid so RLS owner policies apply to their cart. */
  isAnonymous: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Auth | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // Restore an existing session, otherwise sign in anonymously so the visitor
    // has a uid immediately - cart and wishlist policies depend on it.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) setSession(data.session);
      else {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (!cancelled && !error) setSession(anon.session);
      }
      if (!cancelled) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<Auth>(() => ({
    user: session?.user ?? null,
    session,
    ready,
    isAnonymous: Boolean(session?.user?.is_anonymous),
    signUp: async (email, password) => {
      if (!supabase) return "Supabase is not configured.";
      // An anonymous visitor keeps their uid (and cart) by upgrading in place.
      if (session?.user?.is_anonymous) {
        const { error } = await supabase.auth.updateUser({ email, password });
        return error ? error.message : null;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? error.message : null;
    },
    signIn: async (email, password) => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      const { data } = await supabase.auth.signInAnonymously(); // stay usable when signed out
      setSession(data.session ?? null);
    },
  }), [session, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
