import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listInbox, listSentSnaps, type InboxItem, type SentItem } from "@/lib/snaps";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

export function InboxPage() {
  const t = useT();
  const nav = useNavigate();
  const { user, demoMode } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [sent, setSent] = useState<SentItem[]>([]);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setItems([]);
      setSent([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [inbox, sentList] = await Promise.all([
      listInbox(user.id),
      listSentSnaps(user.id),
    ]);
    setItems(inbox);
    setSent(sentList);
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
    if (!user?.id || demoMode || !supabase) return;

    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "snap_recipients",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    const id = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(id);
      void supabase?.removeChannel(channel);
    };
  }, [load, user?.id, demoMode]);

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <h2 style={{ margin: 0 }}>{t("inbox")}</h2>
        <button type="button" className="chip" onClick={() => void load()}>
          {t("refresh")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          type="button"
          className={`chip ${tab === "inbox" ? "active" : ""}`}
          onClick={() => setTab("inbox")}
        >
          {t("inbox")}
          {items.length > 0 ? ` (${items.length})` : ""}
        </button>
        <button
          type="button"
          className={`chip ${tab === "sent" ? "active" : ""}`}
          onClick={() => setTab("sent")}
        >
          {t("sentSnaps")}
        </button>
      </div>

      {demoMode && <div className="banner">{t("setupBanner")}</div>}
      {loading && <p className="muted">{t("loading")}</p>}

      {tab === "inbox" && !loading && items.length === 0 && (
        <p className="muted">{t("emptyInbox")}</p>
      )}

      {tab === "inbox" && (
        <div className="stack" style={{ maxWidth: "none" }}>
          {items.map((it) => (
            <button
              key={it.recipientId}
              type="button"
              className="list-row"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => nav(`/view/${it.recipientId}`)}
            >
              <div
                className="avatar"
                style={{
                  borderColor: "var(--accent)",
                  boxShadow: "0 0 0 2px var(--accent)",
                }}
              >
                {(it.sender.username?.[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <strong>
                  {t("from")} @{it.sender.username ?? "…"}
                </strong>
                <div className="muted">
                  {it.mediaType === "video" ? "🎬" : "📷"} · {it.durationSec}
                  {t("seconds")}
                  {it.caption ? ` · “${it.caption.slice(0, 28)}”` : ""} ·{" "}
                  {t("viewing")}
                </div>
              </div>
              <span style={{ color: "var(--accent)", fontWeight: 800 }}>●</span>
            </button>
          ))}
        </div>
      )}

      {tab === "sent" && !loading && sent.length === 0 && (
        <p className="muted">{t("noSent")}</p>
      )}

      {tab === "sent" && (
        <div className="stack" style={{ maxWidth: "none" }}>
          {sent.map((s) => (
            <div key={s.snapId} className="list-row">
              <div className="avatar">{s.mediaType === "video" ? "🎬" : "📷"}</div>
              <div style={{ flex: 1 }}>
                <strong>
                  {s.mediaType === "video" ? t("video") : t("photo")} ·{" "}
                  {s.durationSec}
                  {t("seconds")}
                </strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {s.recipients.map((r) => (
                    <span key={r.username ?? Math.random()} style={{ marginRight: 8 }}>
                      @{r.username ?? "?"}{" "}
                      {r.status === "pending" || r.status === "opened"
                        ? r.status === "pending"
                          ? `· ${t("waitingOpen")}`
                          : `· ${t("theyOpened")}`
                        : r.status === "consumed"
                          ? `· ${t("theyOpened")}`
                          : ""}
                    </span>
                  ))}
                  {s.reactions.length > 0 && (
                    <span style={{ marginLeft: 6 }}>
                      {s.reactions.join(" ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
