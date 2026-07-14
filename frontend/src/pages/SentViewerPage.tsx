import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { openSentSnap } from "@/lib/snaps";
import { useT } from "@/lib/i18n";

/**
 * Re-view a snap you sent — no consume, no timer pressure.
 */
export function SentViewerPage() {
  const t = useT();
  const { snapId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState<string | null>(null);
  const [caption2, setCaption2] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapId || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const res = await openSentSnap(snapId, user.id);
      if (cancelled) return;
      if (!res || res.error || !res.url) {
        setError(t("alreadyGone"));
        return;
      }
      setUrl(res.url);
      setMediaType(res.mediaType);
      setCaption(res.caption);
      setCaption2(res.caption2);
    })();
    return () => {
      cancelled = true;
    };
  }, [snapId, user?.id, t]);

  if (error) {
    return (
      <div className="page-center">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => nav("/app/inbox", { replace: true })}
        >
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
          top: 24,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 3,
        }}
      >
        <button
          type="button"
          className="chip"
          onClick={() => nav("/app/inbox", { replace: true })}
        >
          ← {t("sentSnaps")}
        </button>
        <span
          style={{
            background: "var(--accent)",
            color: "#000",
            fontWeight: 800,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 13,
          }}
        >
          {t("yourSentSnap")}
        </span>
      </div>

      {url && mediaType === "image" && (
        <img
          src={url}
          alt=""
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      )}
      {url && mediaType === "video" && (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      )}
      {!url && !error && <p className="muted">{t("loading")}</p>}

      {(caption || caption2) && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 16,
            right: 16,
            textAlign: "center",
            textShadow: "0 2px 8px #000",
            color: "#fff",
            zIndex: 2,
          }}
        >
          {caption && (
            <div style={{ fontWeight: 800, fontSize: 18 }}>{caption}</div>
          )}
          {caption2 && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--accent)",
                marginTop: 4,
              }}
            >
              {caption2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
