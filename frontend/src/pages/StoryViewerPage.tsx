import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  listStoryRail,
  markStoryViewed,
  signedStoryUrl,
  type StoryItem,
} from "@/lib/stories";
import { useT } from "@/lib/i18n";

export function StoryViewerPage() {
  const { userId } = useParams();
  const t = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [username, setUsername] = useState("…");
  const [idx, setIdx] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [left, setLeft] = useState(5);
  const timerRef = useRef<number | undefined>(undefined);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !userId) return;
    void (async () => {
      const rail = await listStoryRail(user.id);
      const entry = rail.find((r) => r.profile.id === userId);
      if (!entry || entry.stories.length === 0) {
        nav("/friends", { replace: true });
        return;
      }
      setStories(entry.stories);
      setUsername(entry.profile.username ?? "…");
      setIdx(0);
    })();
  }, [user?.id, userId, nav]);

  useEffect(() => {
    if (!stories[idx] || !user?.id) return;
    let cancelled = false;
    doneRef.current = false;

    void (async () => {
      const story = stories[idx];
      const signed = await signedStoryUrl(story.media_path);
      if (cancelled) return;
      setUrl(signed);
      setLeft(story.duration_sec);
      void markStoryViewed(story.id, user.id);

      if (timerRef.current) window.clearInterval(timerRef.current);
      let remaining = story.duration_sec;
      timerRef.current = window.setInterval(() => {
        remaining -= 1;
        setLeft(remaining);
        if (remaining <= 0) {
          window.clearInterval(timerRef.current);
          advance();
        }
      }, 1000);
    })();

    function advance() {
      if (doneRef.current) return;
      if (idx + 1 < stories.length) {
        setIdx((i) => i + 1);
      } else {
        doneRef.current = true;
        nav(-1);
      }
    }

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [stories, idx, user?.id, nav]);

  function tapSide(e: MouseEvent) {
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (x < mid) {
      if (idx > 0) setIdx((i) => i - 1);
      else nav(-1);
    } else {
      if (idx + 1 < stories.length) setIdx((i) => i + 1);
      else nav(-1);
    }
  }

  const story = stories[idx];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={tapSide}
    >
      {/* progress segments */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 10,
          right: 10,
          display: "flex",
          gap: 4,
          zIndex: 2,
        }}
      >
        {stories.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: i < idx ? "100%" : i === idx ? "100%" : "0%",
                background: "var(--accent)",
                opacity: i === idx ? 0.85 : 1,
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: 24,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <strong>@{username}</strong>
        <span
          style={{
            background: "var(--accent)",
            color: "#000",
            fontWeight: 800,
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 13,
          }}
        >
          {left}s
        </span>
      </div>

      {url && story?.media_type === "image" && (
        <img
          src={url}
          alt=""
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      )}
      {url && story?.media_type === "video" && (
        <video
          src={url}
          autoPlay
          playsInline
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      )}
      {!url && <p className="muted">{t("loading")}</p>}

      {story?.caption && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 16,
            right: 16,
            textAlign: "center",
            fontWeight: 800,
            fontSize: 18,
            textShadow: "0 2px 8px #000",
          }}
        >
          {story.caption}
        </div>
      )}
    </div>
  );
}
