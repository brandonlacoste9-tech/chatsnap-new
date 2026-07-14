import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { isOnboardingDone } from "@/lib/onboarding";

export function UsernameGate() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const deepReturn =
    (location.state as { returnTo?: string } | null)?.returnTo || null;
  const { profile, session, demoMode, setUsername } = useAuth();
  const [username, setU] = useState("");
  const [displayName, setD] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // After username: deep links win; else onboarding if first run
  const afterUsername =
    deepReturn || (isOnboardingDone() ? "/app" : "/onboarding");

  if (!demoMode && !session) return <Navigate to="/auth" replace />;
  if (profile?.username) return <Navigate to={afterUsername} replace />;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await setUsername(username, displayName);
    setBusy(false);
    if (err === "taken") setError(t("usernameTaken"));
    else if (err) setError(err);
    else navigate(afterUsername, { replace: true });
  }

  return (
    <div className="page-center">
      <h1 style={{ margin: 0 }}>{t("pickUsername")}</h1>
      <p className="muted">{t("pickUsernameHint")}</p>
      <form className="stack" onSubmit={(e) => void onSave(e)}>
        <input
          className="field"
          placeholder="@username"
          value={username}
          onChange={(e) => setU(e.target.value)}
          autoCapitalize="none"
          required
        />
        <input
          className="field"
          placeholder={t("displayName")}
          value={displayName}
          onChange={(e) => setD(e.target.value)}
        />
        {error && (
          <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t("save")}
        </button>
      </form>
    </div>
  );
}
