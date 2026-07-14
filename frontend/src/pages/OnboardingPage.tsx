import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { completeOnboarding, isOnboardingDone } from "@/lib/onboarding";
import { inviteUrl, shareInvite } from "@/lib/media";
import { joinHiveByCode } from "@/lib/hives";
import { subscribeWebPush, isPushConfigured } from "@/lib/push";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useToast } from "@/components/Toast";

type Step = 0 | 1 | 2 | 3;

/**
 * First-run tour: vibe · add friend · map tip · first snap
 */
export function OnboardingPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { profile, ready, user } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [hiveJoined, setHiveJoined] = useState(false);
  const username = profile?.username ?? "";

  const invite = useMemo(
    () => (username ? inviteUrl(username) : ""),
    [username],
  );

  if (!ready) {
    return (
      <div className="page-center">
        <p className="muted">{t("loading")}</p>
      </div>
    );
  }

  if (!profile?.username) {
    return <Navigate to="/username" replace />;
  }

  if (isOnboardingDone()) {
    return <Navigate to="/app" replace />;
  }

  function finish(dest: string) {
    completeOnboarding();
    nav(dest, { replace: true });
  }

  function skip() {
    finish("/app");
  }

  async function onShare() {
    if (!username) return;
    const ok = await shareInvite(username);
    toast(ok ? t("inviteCopied") : invite, ok ? "ok" : "info");
  }

  useEffect(() => {
    // Auto-join hive code from landing if present
    if (!user?.id || hiveJoined) return;
    let code = "";
    try {
      code = sessionStorage.getItem("chatsnap_pending_hive") ?? "";
    } catch {
      /* ignore */
    }
    if (!code) return;
    void joinHiveByCode(user.id, code).then(({ hive, error }) => {
      if (hive) {
        toast(t("hiveJoined"), "ok");
        setHiveJoined(true);
        try {
          sessionStorage.removeItem("chatsnap_pending_hive");
        } catch {
          /* ignore */
        }
      } else if (error) {
        toast(error, "err");
      }
    });
  }, [user?.id, hiveJoined, toast, t]);

  const dots = [0, 1, 2, 3] as const;

  return (
    <div
      className="app-root"
      style={{
        minHeight: "100%",
        background:
          "radial-gradient(ellipse at 50% 0%, #2a2200 0%, #0a0a0a 55%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <div className="brand" style={{ fontSize: 18 }}>
          Chat<span>Snap</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageToggle />
          <button type="button" className="chip" onClick={skip}>
            {t("skip")}
          </button>
        </div>
      </div>

      <div
        className="page-center"
        style={{
          paddingTop: 8,
          paddingBottom: 32,
          justifyContent: "flex-start",
          minHeight: "auto",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {dots.map((d) => (
            <div
              key={d}
              style={{
                width: d === step ? 22 : 8,
                height: 8,
                borderRadius: 999,
                background: d === step ? "var(--accent)" : "#333",
                transition: "width 0.2s ease",
              }}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="stack" style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>📷</div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.2,
                color: "var(--accent)",
                textTransform: "uppercase",
              }}
            >
              {t("brandLine")}
            </p>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
              {t("onbWelcomeTitle")}
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {t("onbWelcomeBody")}
            </p>
            <ul
              style={{
                textAlign: "left",
                margin: "8px 0 0",
                paddingLeft: 18,
                color: "var(--muted)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <li>{t("onbPoint1")}</li>
              <li>{t("onbPoint2")}</li>
              <li>{t("onbPoint3")}</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => setStep(1)}
            >
              {t("continue")}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="stack" style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>👥</div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{t("onbFriendTitle")}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {t("onbFriendBody")}
            </p>

            <div
              className="list-row"
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: 10,
                borderColor: "var(--accent)",
                textAlign: "left",
              }}
            >
              <span className="muted" style={{ fontSize: 12 }}>
                {t("yourInvite")}
              </span>
              <strong style={{ fontSize: 20 }}>@{username}</strong>
              <code
                style={{
                  fontSize: 11,
                  wordBreak: "break-all",
                  color: "var(--accent)",
                }}
              >
                {invite}
              </code>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void onShare()}
              >
                {t("shareInvite")}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                completeOnboarding();
                nav("/friends", { replace: true });
              }}
            >
              {t("onbSearchFriends")}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setStep(2)}
            >
              {t("continue")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>🗺️</div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{t("onbMapTitle")}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {t("onbMapBody")}
            </p>
            <ul
              style={{
                textAlign: "left",
                margin: "8px 0 0",
                paddingLeft: 18,
                color: "var(--muted)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <li>{t("onbMapPoint1")}</li>
              <li>{t("onbMapPoint2")}</li>
              <li>{t("onbMapPoint3")}</li>
            </ul>
            {isPushConfigured() && user?.id && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => {
                  void subscribeWebPush(user.id).then((err) => {
                    toast(err ? err : t("pushOk"), err ? "err" : "ok");
                  });
                }}
              >
                🔔 {t("pushEnable")}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setStep(3)}
            >
              {t("continue")}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>✨</div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{t("onbSnapTitle")}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {t("onbSnapBody")}
            </p>

            <div
              style={{
                borderRadius: 20,
                border: "2px dashed #333",
                padding: 20,
                background: "#111",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "4px solid var(--accent)",
                  margin: "0 auto 12px",
                  boxShadow: "0 0 0 4px #000",
                  background: "#1a1a1a",
                }}
              />
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {t("onbSnapTip")}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => finish("/app")}
            >
              {t("onbOpenCamera")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => finish("/app")}
            >
              {t("onbExplore")}
            </button>
          </div>
        )}

        {step > 0 && (
          <button
            type="button"
            className="chip"
            style={{ marginTop: 20 }}
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            ← {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
