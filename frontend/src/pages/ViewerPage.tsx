import { useEffect, useRef, useState } from "react";
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
      setCaption2(res.caption2);
      setSnapId(res.snapId);
      setSenderId(res.senderId);
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

      {(caption || caption2) && (
        <div
          style={{
            position: "absolute",
            bottom: 108,
            left: 16,
            right: 16,
            textAlign: "center",
            textShadow: "0 2px 8px #000",
            color: "#fff",
            zIndex: 2,
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
