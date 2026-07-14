import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useToast } from "@/components/Toast";
import { inviteUrl, shareInvite } from "@/lib/media";
import { ensureNotifyPermission } from "@/lib/notifications";
import { setRestrictedMode } from "@/lib/safety";

export function MePage() {
  const t = useT();
  const { locale } = useI18n();
  const { profile, demoMode, signOut, setVibeStatus, refreshProfile, user } =
    useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [vibe, setVibe] = useState(profile?.vibe_status ?? "");
  const [restricted, setRestricted] = useState(
    Boolean(profile?.restricted_mode),
  );
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

  async function onSaveVibe() {
    setBusy(true);
    const err = await setVibeStatus(vibe);
    setBusy(false);
    if (err) toast(err, "err");
    else toast(t("vibeSaved"), "ok");
  }

  return (
    <div className="app-root">
      <div className="page">
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            color: "var(--accent)",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          {t("brandLine")}
        </div>
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
            {profile?.vibe_status && (
              <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 4 }}>
                ✦ {profile.vibe_status}
              </div>
            )}
          </div>
        </div>

        <h3>{t("vibeStatus")}</h3>
        <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
          {t("vibeHint")}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="field"
            placeholder={t("vibePlaceholder")}
            value={vibe}
            maxLength={60}
            onChange={(e) => setVibe(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void onSaveVibe()}
          >
            {t("save")}
          </button>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 16,
          }}
        >
          {!restricted && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => nav("/discover")}
            >
              ✨ {t("discover")}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => nav("/memories")}
          >
            💾 {t("memories")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => nav("/stickers")}
          >
            🖼️ {t("myStickers")}
          </button>
          {!restricted && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => nav("/map")}
            >
              🗺️ {t("snapMap")}
            </button>
          )}
        </div>

        <h3 style={{ marginTop: 20 }}>{t("restrictedMode")}</h3>
        <p className="muted" style={{ fontSize: 12 }}>
          {t("restrictedHint")}
        </p>
        <button
          type="button"
          className={`chip ${restricted ? "active" : ""}`}
          disabled={busy || demoMode}
          onClick={() => {
            if (!user?.id) return;
            const next = !restricted;
            setBusy(true);
            void setRestrictedMode(user.id, next).then((err) => {
              setBusy(false);
              if (err) toast(err, "err");
              else {
                setRestricted(next);
                void refreshProfile();
                toast(next ? t("restrictedOn") : t("restrictedOff"), "ok");
              }
            });
          }}
        >
          {restricted ? t("restrictedOn") : t("restrictedOff")}
        </button>

        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          {t("betterThanSnap")}
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
