import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useT } from "@/lib/i18n";

/** Prompt when a new service worker is waiting (after deploy). */
export function UpdateToast() {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      // Check for updates periodically while app is open
      if (reg) {
        window.setInterval(() => {
          void reg.update();
        }, 60 * 60 * 1000);
      }
    },
  });
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(needRefresh);
  }, [needRefresh]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 70,
        background: "#1a1800",
        border: "1px solid var(--accent)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
        {t("updateAvailable")}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "6px 12px" }}
        onClick={() => {
          setNeedRefresh(false);
          setShow(false);
        }}
      >
        {t("notNow")}
      </button>
      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: "6px 12px" }}
        onClick={() => void updateServiceWorker(true)}
      >
        {t("updateNow")}
      </button>
    </div>
  );
}
