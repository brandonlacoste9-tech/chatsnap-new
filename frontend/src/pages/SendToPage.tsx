import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listAcceptedFriends } from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { sendSnap } from "@/lib/snaps";
import { compressImage } from "@/lib/media";
import { listStreaksForUser } from "@/lib/streaks";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import type { CaptureResult } from "@/hooks/useCamera";

const DURATIONS = [1, 3, 5, 7, 10];

export function SendToPage() {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const capture = location.state as CaptureResult | null;
  const { user, demoMode, profile } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(5);
  const [caption, setCaption] = useState("");
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
    void (async () => {
      const list = await listAcceptedFriends(id);
      setFriends(list);
      if (list.length === 1) setSelected(new Set([list[0].id]));
      setStreaks(await listStreaksForUser(id));
    })();
  }, [capture, user?.id, profile?.id, demoMode, nav]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(friends.map((f) => f.id)));
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

    let blob = capture.blob;
    if (capture.mediaType === "image") {
      try {
        blob = await compressImage(capture.blob);
      } catch {
        /* keep original */
      }
    }

    const err = await sendSnap({
      senderId,
      blob,
      mediaType: capture.mediaType,
      durationSec: duration,
      recipientIds: [...selected],
      caption: caption.trim() || undefined,
    });
    setBusy(false);
    if (err) {
      setError(err);
      toast(err, "err");
      return;
    }
    URL.revokeObjectURL(capture.previewUrl);
    toast(
      caption.trim()
        ? `${t("sendOk")} “${caption.trim().slice(0, 40)}”`
        : t("sendOk"),
      "ok",
    );
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

      <label className="muted" style={{ display: "block", marginTop: 12 }}>
        {t("caption")}
      </label>
      <input
        className="field"
        placeholder={t("captionPlaceholder")}
        value={caption}
        maxLength={80}
        onChange={(e) => setCaption(e.target.value)}
      />

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <p className="muted" style={{ margin: 0 }}>
          {t("selectFriends")}
        </p>
        {friends.length > 1 && (
          <button type="button" className="chip" onClick={selectAll}>
            {t("selectAll")}
          </button>
        )}
      </div>

      {demoMode && <div className="banner">{t("setupBanner")}</div>}

      {!demoMode && friends.length === 0 && (
        <div className="list-row" style={{ flexDirection: "column", gap: 10 }}>
          <p className="muted" style={{ margin: 0 }}>
            {t("noFriends")}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => nav("/friends")}
          >
            {t("goFriends")}
          </button>
        </div>
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
              background: selected.has(f.id) ? "#1a1800" : undefined,
            }}
            onClick={() => toggle(f.id)}
          >
            <div className="avatar">
              {(f.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>@{f.username}</strong>
              <div className="muted">
                {f.display_name}
                {(streaks.get(f.id) ?? 0) > 0
                  ? ` · 🔥 ${streaks.get(f.id)} ${t("dayStreak")}`
                  : ""}
              </div>
            </div>
            <span style={{ fontSize: 18, color: "var(--accent)" }}>
              {selected.has(f.id) ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 12 }}
        disabled={busy || friends.length === 0}
        onClick={() => void onSend()}
      >
        {busy ? t("loading") : `${t("send")} (${selected.size})`}
      </button>
    </div>
  );
}
