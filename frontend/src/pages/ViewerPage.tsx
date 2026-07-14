import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { consumeSnap, openSnap } from "@/lib/snaps";
import { REACTION_EMOJIS, sendSnapReaction } from "@/lib/reactions";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";

function buildReplySnippet(
  caption: string | null,
  caption2: string | null,
): string {
  const parts = [caption, caption2].filter(Boolean) as string[];
  if (parts.length) return parts.join(" · ").slice(0, 160);
  return "📷 Snap";
}

export function ViewerPage() {
  const t = useT();
  const { recipientId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState<string | null>(null);
  const [caption2, setCaption2] = useState<string | null>(null);
  const [snapId, setSnapId] = useState<string | null>(null);
  const [senderId, setSenderId] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(0);
  /** 0 = open until you close (no auto-timer) */
  const [infinite, setInfinite] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reacted, setReacted] = useState<string | null>(null);
  const done = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const remainingRef = useRef(0);
  const pausedRef = useRef(false);

  const finish = useCallback(async () => {
    if (done.current || !recipientId) return;
    done.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    await consumeSnap(recipientId);
    nav("/app/inbox", { replace: true });
  }, [recipientId, nav]);

  const startTicker = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (infinite || pausedRef.current) return;
    timerRef.current = window.setInterval(() => {
      if (pausedRef.current) return;
      remainingRef.current -= 1;
      setLeft(remainingRef.current);
      if (remainingRef.current <= 0) {
        window.clearInterval(timerRef.current);
        void finish();
      }
    }, 1000);
  }, [finish, infinite]);

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
      setCaption2(res.caption2);
      setSnapId(res.snapId);
      setSenderId(res.senderId);

      const dur = res.durationSec ?? 10;
      const isInf = dur <= 0;
      setInfinite(isInf);
      setTotal(isInf ? 0 : dur);
      remainingRef.current = isInf ? 0 : dur;
      setLeft(isInf ? 0 : dur);

      if (!isInf) {
        startTicker();
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      // Leaving without finishing still consumes (view-once)
      if (!done.current && recipientId) {
        void consumeSnap(recipientId);
        done.current = true;
      }
    };
  }, [recipientId, t, startTicker]);

  function setHold(hold: boolean) {
    pausedRef.current = hold;
    setPaused(hold);
    if (infinite) return;
    if (hold) {
      if (timerRef.current) window.clearInterval(timerRef.current);
    } else {
      startTicker();
    }
  }

  async function onReact(emoji: string) {
    if (!snapId || !user?.id) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const err = await sendSnapReaction(snapId, user.id, emoji);
    if (err) {
      toast(err, "err");
      return;
    }
    setReacted(emoji);
    toast(`${t("reacted")} ${emoji}`, "ok");
    window.setTimeout(() => {
      void finish();
    }, 600);
  }

  async function onReply() {
    if (!senderId || !recipientId) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!done.current) {
      done.current = true;
      await consumeSnap(recipientId);
    }
    nav(`/chat/${senderId}`, {
      replace: true,
      state: {
        replyToSnap: {
          snapId: snapId ?? undefined,
          snippet: buildReplySnippet(caption, caption2),
        },
      },
    });
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

  const progress =
    !infinite && total > 0 ? Math.max(0, Math.min(1, left / total)) : 1;

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
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={() => setHold(true)}
      onPointerUp={() => setHold(false)}
      onPointerCancel={() => setHold(false)}
      onPointerLeave={() => setHold(false)}
    >
      {/* Progress bar */}
      {!infinite && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
            zIndex: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: "var(--accent)",
              transition: paused ? "none" : "width 0.9s linear",
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 28,
          right: 16,
          background: paused ? "#333" : "var(--accent)",
          color: paused ? "#fff" : "#000",
          fontWeight: 800,
          borderRadius: 999,
          padding: "6px 12px",
          zIndex: 2,
          fontSize: 14,
        }}
      >
        {infinite
          ? t("snapHoldClose")
          : paused
            ? `⏸ ${t("snapPaused")}`
            : `${left}${t("seconds")}`}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void finish();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 24,
          left: 14,
          zIndex: 4,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid #333",
          color: "#fff",
          borderRadius: 999,
          padding: "6px 12px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

      {url && mediaType === "image" && (
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}
      {url && mediaType === "video" && (
        <video
          src={url}
          autoPlay
          playsInline
          loop={infinite}
          style={{ maxWidth: "100%", maxHeight: "100%", pointerEvents: "none" }}
        />
      )}
      {!url && !error && <p className="muted">{t("loading")}</p>}

      {(caption || caption2) && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: 16,
            right: 16,
            textAlign: "center",
            textShadow: "0 2px 8px #000",
            color: "#fff",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {caption && (
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              {caption}
            </div>
          )}
          {caption2 && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                opacity: 0.92,
                color: "var(--accent)",
              }}
            >
              {caption2}
            </div>
          )}
        </div>
      )}

      <p
        className="muted"
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 11,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {t("snapHoldHint")}
      </p>

      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          zIndex: 3,
          pointerEvents: "auto",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
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
        {senderId && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "0.55rem 1.2rem", fontSize: 14 }}
            onClick={() => void onReply()}
          >
            💬 {t("replyToSnap")}
          </button>
        )}
      </div>
    </div>
  );
}
