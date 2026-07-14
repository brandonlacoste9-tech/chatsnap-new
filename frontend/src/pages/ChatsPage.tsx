import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listChatPreviews, type ChatPreview } from "@/lib/messages";
import { useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";

export function ChatsPage() {
  const t = useT();
  const nav = useNavigate();
  const { user, demoMode } = useAuth();
  const [rows, setRows] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setRows(await listChatPreviews(user.id));
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  function previewText(p: ChatPreview) {
    const m = p.lastMessage;
    if (!m) return t("sayHi");
    if (m.media_type === "audio") return "🎤 " + t("voiceNote");
    if (m.media_type === "image") return "📷";
    return m.body ?? "";
  }

  return (
    <div className="app-root">
      <div className="page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>{t("chats")}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="chip active"
              onClick={() => nav("/groups")}
            >
              👥 {t("groups")}
            </button>
            <button type="button" className="chip" onClick={() => void load()}>
              {t("refresh")}
            </button>
          </div>
        </div>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}
        {loading && <p className="muted">{t("loading")}</p>}
        {!loading && rows.length === 0 && (
          <div className="list-row" style={{ flexDirection: "column", gap: 10 }}>
            <p className="muted" style={{ margin: 0 }}>
              {t("noChats")}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => nav("/friends")}
            >
              {t("goFriends")}
            </button>
          </div>
        )}

        <div className="stack" style={{ maxWidth: "none", marginTop: 12 }}>
          {rows.map((p) => (
            <button
              key={p.friend.id}
              type="button"
              className="list-row"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => nav(`/chat/${p.friend.id}`)}
            >
              <div className="avatar">
                {(p.friend.username?.[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>@{p.friend.username}</strong>
                {p.friend.vibe_status && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✦ {p.friend.vibe_status}
                  </div>
                )}
                <div
                  className="muted"
                  style={{
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.lastMessage?.ephemeral ? "👻 " : ""}
                  {previewText(p)}
                </div>
              </div>
              {p.unread > 0 && (
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: 12,
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {p.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
