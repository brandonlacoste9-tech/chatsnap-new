import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useToast } from "@/components/Toast";
import { inviteUrl, shareInvite } from "@/lib/media";
import { ensureNotifyPermission } from "@/lib/notifications";

export function MePage() {
  const t = useT();
  const { locale } = useI18n();
  const { profile, demoMode, signOut } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [notifState, setNotifState] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const username = profile?.username ?? "";
  const link = username ? inviteUrl(username) : "";

  async function onShare() {
    if (!username) return;
    setBusy(true);
    const ok = await shareInvite(username);
    setBusy(false);
    toast(ok ? t("inviteCopied") : link, ok ? "ok" : "info");
  }

  async function onNotifs() {
    const ok = await ensureNotifyPermission();
    setNotifState(
      typeof Notification !== "undefined" ? Notification.permission : "denied",
    );
    toast(ok ? t("notifsOn") : t("notifsOff"), ok ? "ok" : "info");
  }

  return (
    <div className="app-root">
      <div className="page">
        <h2>{t("me")}</h2>
        <div className="list-row">
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
            {(username?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <strong style={{ fontSize: 18 }}>@{username || "—"}</strong>
            <div className="muted">
              {t("signedInAs")} {profile?.display_name ?? "—"}
              {demoMode ? ` · ${t("demoMode")}` : ""}
            </div>
          </div>
        </div>

        {username && (
          <>
            <h3>{t("yourInvite")}</h3>
            <div
              className="list-row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
            >
              <code
                style={{
                  fontSize: 12,
                  wordBreak: "break-all",
                  color: "var(--accent)",
                }}
              >
                {link}
              </code>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void onShare()}
              >
                {t("shareInvite")}
              </button>
            </div>
          </>
        )}

        <h3>{t("language")}</h3>
        <LanguageToggle />
        <p className="muted" style={{ marginTop: 8 }}>
          {locale.toUpperCase()}
        </p>

        <h3 style={{ marginTop: 20 }}>{t("enableNotifs")}</h3>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "100%" }}
          onClick={() => void onNotifs()}
        >
          {notifState === "granted" ? t("notifsOn") : t("enableNotifs")}
        </button>

        <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
          {t("installHint")}
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 16, width: "100%" }}
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
