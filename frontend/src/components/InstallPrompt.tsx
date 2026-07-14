import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "chatsnap_install_dismissed";

/**
 * Soft install CTA — Chrome/Edge beforeinstallprompt + iOS tip.
 */
export function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari tip (no beforeinstallprompt)
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIos(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("installApp")}
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(64px + var(--safe-bottom))",
        zIndex: 60,
        background: "#141414",
        border: "1px solid var(--accent)",
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src="/pwa-192.png"
          alt=""
          width={44}
          height={44}
          style={{ borderRadius: 12 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block" }}>{t("installApp")}</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            {showIos && !deferred ? t("installIosHint") : t("installHint")}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={dismiss}>
          {t("notNow")}
        </button>
        {deferred && (
          <button type="button" className="btn btn-primary" onClick={() => void install()}>
            {t("install")}
          </button>
        )}
      </div>
    </div>
  );
}
