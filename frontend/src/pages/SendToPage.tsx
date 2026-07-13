import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listAcceptedFriends } from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { sendSnap } from "@/lib/snaps";
import { useT } from "@/lib/i18n";
import type { CaptureResult } from "@/hooks/useCamera";

const DURATIONS = [1, 3, 5, 7, 10];

export function SendToPage() {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const capture = location.state as CaptureResult | null;
  const { user, demoMode, profile } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!capture) {
      nav("/app", { replace: true });
      return;
    }
    const id = user?.id ?? profile?.id;
    if (!id || demoMode) {
      setFriends([]);
      return;
    }
    void listAcceptedFriends(id).then(setFriends);
  }, [capture, user?.id, profile?.id, demoMode, nav]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function onSend() {
    if (!capture) return;
    if (demoMode) {
      setError(t("setupBanner"));
      return;
    }
    if (selected.size === 0) {
      setError(t("needFriend"));
      return;
    }
    const senderId = user?.id;
    if (!senderId) return;
    setBusy(true);
    setError(null);
    const err = await sendSnap({
      senderId,
      blob: capture.blob,
      mediaType: capture.mediaType,
      durationSec: duration,
      recipientIds: [...selected],
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    URL.revokeObjectURL(capture.previewUrl);
    nav("/app", { replace: true });
  }

  if (!capture) return null;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>
        ← {t("retake")}
      </button>
      <h2>{t("sendTo")}</h2>

      {capture.mediaType === "image" ? (
        <img
          src={capture.previewUrl}
          alt=""
          style={{
            width: "100%",
            maxHeight: 240,
            objectFit: "cover",
            borderRadius: 16,
          }}
        />
      ) : (
        <video
          src={capture.previewUrl}
          controls
          style={{ width: "100%", maxHeight: 240, borderRadius: 16 }}
        />
      )}

      <p className="muted">{t("duration")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            className={`chip ${duration === d ? "active" : ""}`}
            onClick={() => setDuration(d)}
          >
            {d}
            {t("seconds")}
          </button>
        ))}
      </div>

      <p className="muted">{t("selectFriends")}</p>
      {demoMode && <div className="banner">{t("setupBanner")}</div>}
      {!demoMode && friends.length === 0 && (
        <p className="muted">{t("noFriends")}</p>
      )}
      <div className="stack" style={{ maxWidth: "none" }}>
        {friends.map((f) => (
          <button
            key={f.id}
            type="button"
            className="list-row"
            style={{
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              borderColor: selected.has(f.id) ? "var(--accent)" : undefined,
            }}
            onClick={() => toggle(f.id)}
          >
            <div className="avatar">
              {(f.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>@{f.username}</strong>
              <div className="muted">{f.display_name}</div>
            </div>
            {selected.has(f.id) ? "✓" : ""}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 12 }}
        disabled={busy}
        onClick={() => void onSend()}
      >
        {t("send")}
      </button>
    </div>
  );
}
