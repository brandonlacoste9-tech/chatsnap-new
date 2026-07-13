import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";
import { LanguageToggle } from "@/components/LanguageToggle";

export function MePage() {
  const t = useT();
  const { locale } = useI18n();
  const { profile, demoMode, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="app-root">
      <div className="page">
        <h2>{t("me")}</h2>
        <div className="list-row">
          <div className="avatar">
            {(profile?.username?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <strong>@{profile?.username ?? "—"}</strong>
            <div className="muted">
              {t("signedInAs")} {profile?.display_name ?? "—"}
              {demoMode ? ` · ${t("demoMode")}` : ""}
            </div>
          </div>
        </div>

        <h3>{t("language")}</h3>
        <LanguageToggle />
        <p className="muted" style={{ marginTop: 8 }}>
          {locale.toUpperCase()}
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 24, width: "100%" }}
          onClick={() => {
            void signOut().then(() => nav("/auth", { replace: true }));
          }}
        >
          {t("signOut")}
        </button>
      </div>
      <BottomChrome />
    </div>
  );
}
