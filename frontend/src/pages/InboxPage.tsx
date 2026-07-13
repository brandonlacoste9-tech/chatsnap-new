import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listInbox, type InboxItem } from "@/lib/snaps";
import { useT } from "@/lib/i18n";

export function InboxPage() {
  const t = useT();
  const nav = useNavigate();
  const { user, demoMode } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await listInbox(user.id));
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <h2 style={{ marginTop: 8 }}>{t("inbox")}</h2>
      {demoMode && <div className="banner">{t("setupBanner")}</div>}
      {loading && <p className="muted">{t("loading")}</p>}
      {!loading && items.length === 0 && (
        <p className="muted">{t("emptyInbox")}</p>
      )}
      <div className="stack" style={{ maxWidth: "none" }}>
        {items.map((it) => (
          <button
            key={it.recipientId}
            type="button"
            className="list-row"
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            onClick={() => nav(`/view/${it.recipientId}`)}
          >
            <div className="avatar">
              {(it.sender.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>
                {t("from")} @{it.sender.username ?? "…"}
              </strong>
              <div className="muted">
                {it.mediaType === "video" ? "🎬" : "📷"} · {it.durationSec}
                {t("seconds")} · {t("viewing")}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
