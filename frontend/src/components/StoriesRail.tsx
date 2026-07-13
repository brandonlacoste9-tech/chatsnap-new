import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listStoryRail, type StoryRailUser } from "@/lib/stories";
import { useT } from "@/lib/i18n";

export function StoriesRail() {
  const t = useT();
  const nav = useNavigate();
  const { user, demoMode } = useAuth();
  const [rail, setRail] = useState<StoryRailUser[]>([]);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setRail([]);
      return;
    }
    setRail(await listStoryRail(user.id));
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(id);
  }, [load]);

  if (demoMode) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        padding: "10px 4px 14px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Add to my story shortcut */}
      <button
        type="button"
        onClick={() => nav("/app?story=1")}
        style={{
          border: "none",
          background: "transparent",
          color: "#fff",
          padding: 0,
          minWidth: 72,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "2px dashed var(--accent)",
            display: "grid",
            placeItems: "center",
            fontSize: 28,
            margin: "0 auto 6px",
            background: "#141414",
          }}
        >
          +
        </div>
        <div style={{ fontSize: 11, textAlign: "center" }}>{t("myStory")}</div>
      </button>

      {rail.map((r) => {
        const has = r.stories.length > 0;
        const ring = r.isMe
          ? has
            ? "var(--accent)"
            : "#333"
          : r.hasUnseen
            ? "var(--accent)"
            : "#444";
        return (
          <button
            key={r.profile.id}
            type="button"
            disabled={!has && !r.isMe}
            onClick={() => {
              if (has) nav(`/story/${r.profile.id}`);
              else if (r.isMe) nav("/app?story=1");
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              padding: 0,
              minWidth: 72,
              cursor: has || r.isMe ? "pointer" : "default",
              opacity: has || r.isMe ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `3px solid ${ring}`,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                margin: "0 auto 6px",
                background: "#1a1a1a",
                boxShadow: r.hasUnseen ? "0 0 0 2px #000" : undefined,
              }}
            >
              {(r.profile.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 11,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 72,
              }}
            >
              {r.isMe ? t("myStory") : `@${r.profile.username}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
