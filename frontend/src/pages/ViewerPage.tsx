import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { consumeSnap, openSnap } from "@/lib/snaps";
import { useT } from "@/lib/i18n";

export function ViewerPage() {
  const t = useT();
  const { recipientId } = useParams();
  const nav = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!recipientId) return;
    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      const res = await openSnap(recipientId);
      if (cancelled) return;
      if (!res || res.error) {
        setError(res?.error === "expired" ? t("expired") : t("alreadyGone"));
        return;
      }
      setUrl(res.url);
      setMediaType(res.mediaType);
      setLeft(res.durationSec);

      let remaining = res.durationSec;
      timer = window.setInterval(() => {
        remaining -= 1;
        setLeft(remaining);
        if (remaining <= 0) {
          window.clearInterval(timer);
          void finish();
        }
      }, 1000);
    })();

    async function finish() {
      if (done.current || !recipientId) return;
      done.current = true;
      await consumeSnap(recipientId);
      nav("/app/inbox", { replace: true });
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      if (!done.current && recipientId) {
        void consumeSnap(recipientId);
        done.current = true;
      }
    };
  }, [recipientId, nav, t]);

  if (error) {
    return (
      <div className="page-center">
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => nav("/app/inbox")}>
          {t("inbox")}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "var(--accent)",
          color: "#000",
          fontWeight: 800,
          borderRadius: 999,
          padding: "6px 12px",
        }}
      >
        {left}
        {t("seconds")}
      </div>
      {url && mediaType === "image" && (
        <img
          src={url}
          alt=""
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      )}
      {url && mediaType === "video" && (
        <video
          src={url}
          autoPlay
          playsInline
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      )}
      {!url && !error && <p className="muted">{t("loading")}</p>}
    </div>
  );
}
