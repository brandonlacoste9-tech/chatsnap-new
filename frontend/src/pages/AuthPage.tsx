import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AuthPage() {
  const t = useT();
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || "/app";
  const { demoMode, profile, session, signIn, signUp, setUsername } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Demo: skip to username if no profile yet, else app
  if (demoMode && profile?.username) return <Navigate to={returnTo} replace />;
  if (demoMode && !profile?.username) {
    /* stay — show demo enter */
  } else if (session && profile?.username) {
    return <Navigate to={returnTo} replace />;
  } else if (session && !profile?.username) {
    return <Navigate to="/username" replace state={{ returnTo }} />;
  }

  async function onDemoEnter() {
    setBusy(true);
    await setUsername("demo_user", "Demo");
    setBusy(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="page-center">
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <LanguageToggle />
      </div>
      <div className="brand">
        Chat<span>Snap</span>
      </div>
      <p className="muted">{t("authSubtitle")}</p>

      {!isSupabaseConfigured && (
        <div className="banner" style={{ maxWidth: 360, textAlign: "left" }}>
          {t("setupBanner")}
        </div>
      )}

      {demoMode ? (
        <div className="stack">
          <p className="muted">{t("demoMode")}</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void onDemoEnter()}
          >
            {t("continue")}
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="field"
            type="email"
            autoComplete="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="field"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && (
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 14 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {mode === "login" ? t("login") : t("signup")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? t("noAccount") : t("hasAccount")}
          </button>
        </form>
      )}
    </div>
  );
}
