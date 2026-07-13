import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, type Profile } from "@/lib/supabase";

type AuthValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  demoMode: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  setUsername: (
    username: string,
    displayName?: string,
  ) => Promise<string | null>;
};

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_PROFILE_KEY = "chatsnap_demo_profile";

function loadDemoProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(DEMO_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const demoMode = !isSupabaseConfigured;

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (demoMode) {
      setProfile(loadDemoProfile());
      return;
    }
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [demoMode, fetchProfile, session?.user?.id]);

  useEffect(() => {
    if (demoMode) {
      setProfile(loadDemoProfile());
      setReady(true);
      return;
    }
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) void fetchProfile(data.session.user.id);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) void fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [demoMode, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Demo mode — configure Supabase";
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Demo mode — configure Supabase";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (demoMode) {
      localStorage.removeItem(DEMO_PROFILE_KEY);
      setProfile(null);
      return;
    }
    await supabase?.auth.signOut();
    setProfile(null);
  }, [demoMode]);

  const setUsername = useCallback(
    async (username: string, displayName?: string) => {
      const clean = username.trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
        return "3–20 chars: a-z, 0-9, _";
      }

      if (demoMode) {
        const p: Profile = {
          id: "demo-user",
          username: clean,
          display_name: displayName?.trim() || clean,
          avatar_url: null,
          locale: null,
        };
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(p));
        setProfile(p);
        return null;
      }

      if (!supabase || !session?.user) return "Not signed in";
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        username: clean,
        display_name: displayName?.trim() || clean,
      });
      if (error) {
        if (error.code === "23505") return "taken";
        return error.message;
      }
      await fetchProfile(session.user.id);
      return null;
    },
    [demoMode, fetchProfile, session?.user],
  );

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      demoMode,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      setUsername,
    }),
    [
      ready,
      session,
      profile,
      demoMode,
      refreshProfile,
      signUp,
      signIn,
      signOut,
      setUsername,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
