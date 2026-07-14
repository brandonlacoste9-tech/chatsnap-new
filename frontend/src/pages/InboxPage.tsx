import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteSentSnap,
  dismissInboxSnap,
  listInbox,
  listSentSnaps,
  type InboxItem,
  type SentItem,
} from "@/lib/snaps";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { SwipeToErase } from "@/components/SwipeToErase";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";

export function InboxPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
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

  async function eraseInbox(it: InboxItem) {
    if (!user?.id) return;
    const err = await dismissInboxSnap(it.recipientId, user.id);
    if (err) toast(err, "err");
    else {
      setItems((prev) => prev.filter((x) => x.recipientId !== it.recipientId));
      toast(t("snapErased"), "ok");
    }
  }

  async function eraseSent(s: SentItem) {
    if (!user?.id) return;
    const err = await deleteSentSnap(s.snapId, user.id);
    if (err) toast(err, "err");
    else {
      setSent((prev) => prev.filter((x) => x.snapId !== s.snapId));
      toast(t("snapErased"), "ok");
    }
  }

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
        <h2 className="page-title">{t("inbox")}</h2>
        <button type="button" className="chip" onClick={() => void load()}>
          {t("refresh")}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {t("swipeEraseHint")}
      </p>

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
      {loading && <SkeletonList rows={5} />}

      {tab === "inbox" && !loading && items.length === 0 && (
        <EmptyState
          icon="📬"
          title={t("emptyInbox")}
          body={t("emptyInboxBody")}
          action={
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => nav("/app")}
            >
              {t("emptyInboxCta")}
            </button>
          }
        />
      )}

      {tab === "inbox" && (
        <div className="stack" style={{ maxWidth: "none", gap: 8 }}>
          {items.map((it) => (
            <SwipeToErase
              key={it.recipientId}
              onErase={() => eraseInbox(it)}
              label={t("swipeErase")}
            >
              <button
                type="button"
                className="list-row"
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                }}
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
                    {it.mediaType === "video" ? "🎬" : "📷"} ·{" "}
                    {it.durationSec === 0
                      ? t("durationOpen")
                      : `${it.durationSec}${t("seconds")}`}
                    {it.caption ? ` · “${it.caption.slice(0, 28)}”` : ""} ·{" "}
                    {t("viewing")}
                  </div>
                </div>
                <span style={{ color: "var(--accent)", fontWeight: 800 }}>
                  ●
                </span>
              </button>
            </SwipeToErase>
          ))}
        </div>
      )}

      {tab === "sent" && !loading && sent.length === 0 && (
        <EmptyState
          icon="📤"
          title={t("noSent")}
          body={t("emptySentBody")}
          action={
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => nav("/app")}
            >
              {t("emptyInboxCta")}
            </button>
          }
        />
      )}

      {tab === "sent" && (
        <div className="stack" style={{ maxWidth: "none", gap: 8 }}>
          {sent.map((s) => (
            <SwipeToErase
              key={s.snapId}
              onErase={() => eraseSent(s)}
              label={t("swipeErase")}
            >
              <button
                type="button"
                className="list-row"
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                }}
                onClick={() => nav(`/sent/${s.snapId}`)}
              >
                <div className="avatar">
                  {s.mediaType === "video" ? "🎬" : "📷"}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>
                    {s.mediaType === "video" ? t("video") : t("photo")}
                    {s.durationSec === 0
                      ? ` · ${t("durationOpen")}`
                      : ` · ${s.durationSec}${t("seconds")}`}
                  </strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {s.caption ? `“${s.caption.slice(0, 32)}” · ` : ""}
                    {s.recipients.length === 0
                      ? t("noRecipients")
                      : s.recipients.map((r, i) => (
                          <span
                            key={`${r.username}-${i}`}
                            style={{ marginRight: 8 }}
                          >
                            @{r.username ?? "?"}{" "}
                            {r.status === "pending"
                              ? `· ${t("waitingOpen")}`
                              : r.status === "opened" ||
                                  r.status === "consumed"
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
                  <div
                    className="muted"
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      color: "var(--accent)",
                    }}
                  >
                    {t("tapToViewSent")} · {t("swipeEraseHintShort")}
                  </div>
                </div>
                <span style={{ color: "var(--accent)", fontWeight: 800 }}>
                  ›
                </span>
              </button>
            </SwipeToErase>
          ))}
        </div>
      )}
    </div>
  );
}
