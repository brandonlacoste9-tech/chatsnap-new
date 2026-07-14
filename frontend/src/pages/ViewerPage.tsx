import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { consumeSnap, openSnap } from "@/lib/snaps";
import { REACTION_EMOJIS, sendSnapReaction } from "@/lib/reactions";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";

export function ViewerPage() {
  const t = useT();
  const { recipientId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState<string | null>(null);
  const [snapId, setSnapId] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reacted, setReacted] = useState<string | null>(null);
  const done = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!recipientId) return;
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
      setCaption(res.caption);
      setSnapId(res.snapId);
      setLeft(res.durationSec);

      let remaining = res.durationSec;
      timerRef.current = window.setInterval(() => {
        remaining -= 1;
        setLeft(remaining);
        if (remaining <= 0) {
          window.clearInterval(timerRef.current);
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
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (!done.current && recipientId) {
        void consumeSnap(recipientId);
        done.current = true;
      }
    };
  }, [recipientId, nav, t]);

  async function onReact(emoji: string) {
    if (!snapId || !user?.id) return;
    // Pause countdown briefly so user can react
    if (timerRef.current) window.clearInterval(timerRef.current);
    const err = await sendSnapReaction(snapId, user.id, emoji);
    if (err) {
      toast(err, "err");
      return;
    }
    setReacted(emoji);
    toast(`${t("reacted")} ${emoji}`, "ok");
    window.setTimeout(() => {
      void (async () => {
        if (done.current || !recipientId) return;
        done.current = true;
        await consumeSnap(recipientId);
        nav("/app/inbox", { replace: true });
      })();
    }, 600);
  }

  if (error) {
    return (
      <div className="page-center">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => nav("/app/inbox")}
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
          top: 28,
          right: 16,
          background: "var(--accent)",
          color: "#000",
          fontWeight: 800,
          borderRadius: 999,
          padding: "6px 12px",
          zIndex: 2,
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

      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 16,
            right: 16,
            textAlign: "center",
            fontWeight: 800,
            fontSize: 18,
            textShadow: "0 2px 8px #000",
            color: "#fff",
          }}
        >
          {caption}
        </div>
      )}

      {/* Quick react bar */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          zIndex: 3,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => void onReact(e)}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border:
                reacted === e ? "2px solid var(--accent)" : "1px solid #333",
              background: "rgba(0,0,0,0.55)",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
