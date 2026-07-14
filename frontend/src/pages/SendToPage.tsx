import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listAcceptedFriends } from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { sendSnap } from "@/lib/snaps";
import { publishStory } from "@/lib/stories";
import { publishSpotlight } from "@/lib/spotlight";
import { compressImage } from "@/lib/media";
import { listStreaksForUser } from "@/lib/streaks";
import { saveMemory } from "@/lib/memories";
import { captionForTime, suggestCaptions } from "@/lib/captions";
import { useI18n, useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import type { CaptureResult } from "@/hooks/useCamera";

const DURATIONS = [1, 3, 5, 7, 10];

type Dest = "friends" | "story" | "spotlight";
type SendState = CaptureResult & { toStory?: boolean };

export function SendToPage() {
  const t = useT();
  const { locale } = useI18n();
  const nav = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const capture = location.state as SendState | null;
  const { user, demoMode, profile } = useAuth();
  const restricted = Boolean(profile?.restricted_mode);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(5);
  const [caption, setCaption] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [dest, setDest] = useState<Dest>(
    capture?.toStory ? "story" : "friends",
  );
  const [saveVault, setSaveVault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!capture) {
      nav("/app", { replace: true });
      return;
    }
    if (capture.toStory) setDest("story");
    setIdeas([captionForTime(locale), ...suggestCaptions(locale, 5)]);
    const id = user?.id ?? profile?.id;
    if (!id || demoMode) {
      setFriends([]);
      return;
    }
    void (async () => {
      const list = await listAcceptedFriends(id);
      setFriends(list);
      if (list.length === 1 && !capture.toStory)
        setSelected(new Set([list[0].id]));
      setStreaks(await listStreaksForUser(id));
    })();
  }, [capture, user?.id, profile?.id, demoMode, nav, locale]);

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

  async function prepareBlob() {
    if (!capture) return null;
    let blob = capture.blob;
    if (capture.mediaType === "image") {
      try {
        blob = await compressImage(capture.blob);
      } catch {
        /* keep original */
      }
    }
    return blob;
  }

  async function onSend() {
    if (!capture) return;
    if (demoMode) {
      setError(t("setupBanner"));
      return;
    }
    const senderId = user?.id;
    if (!senderId) return;

    if (dest === "friends" && selected.size === 0) {
      setError(t("needFriend"));
      return;
    }

    setBusy(true);
    setError(null);
    const blob = await prepareBlob();
    if (!blob) {
      setBusy(false);
      return;
    }

    let err: string | null = null;
    if (dest === "story") {
      err = await publishStory({
        userId: senderId,
        blob,
        mediaType: capture.mediaType,
        caption: caption.trim() || undefined,
        durationSec: duration,
      });
    } else if (dest === "spotlight") {
      err = await publishSpotlight({
        userId: senderId,
        blob,
        mediaType: capture.mediaType,
        caption: caption.trim() || undefined,
      });
    } else {
      err = await sendSnap({
        senderId,
        blob,
        mediaType: capture.mediaType,
        durationSec: duration,
        recipientIds: [...selected],
        caption: caption.trim() || undefined,
      });
    }

    if (err) {
      setBusy(false);
      setError(err);
      toast(err, "err");
      return;
    }

    // Better than Snap: keep a permanent copy if you want
    if (saveVault) {
      const memErr = await saveMemory({
        userId: senderId,
        blob,
        mediaType: capture.mediaType,
        caption: caption.trim() || undefined,
        source:
          dest === "story"
            ? "story"
            : dest === "spotlight"
              ? "spotlight"
              : "snap",
      });
      if (memErr) {
        // non-fatal
        console.warn("memory save", memErr);
      }
    }

    setBusy(false);
    URL.revokeObjectURL(capture.previewUrl);
    const okMsg =
      dest === "story"
        ? t("storyPosted")
        : dest === "spotlight"
          ? t("spotlightPosted")
          : t("sendOk");
    toast(saveVault ? `${okMsg} · 💾` : okMsg, "ok");
    nav(
      dest === "spotlight" ? "/discover" : dest === "story" ? "/friends" : "/app",
      { replace: true },
    );
  }

  if (!capture) return null;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>
        ← {t("retake")}
      </button>
      <h2>
        {dest === "story"
          ? t("myStory")
          : dest === "spotlight"
            ? t("spotlight")
            : t("sendTo")}
      </h2>

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

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`chip ${dest === "friends" ? "active" : ""}`}
          onClick={() => setDest("friends")}
        >
          {t("sendToFriends")}
        </button>
        <button
          type="button"
          className={`chip ${dest === "story" ? "active" : ""}`}
          onClick={() => setDest("story")}
        >
          📖 {t("myStory")}
        </button>
        {!restricted && (
          <button
            type="button"
            className={`chip ${dest === "spotlight" ? "active" : ""}`}
            onClick={() => setDest("spotlight")}
          >
            ✨ {t("spotlight")}
          </button>
        )}
      </div>

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
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <span className="muted" style={{ fontSize: 12, width: "100%" }}>
          ✨ {t("smartCaptions")}
        </span>
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            className="chip"
            style={{ fontSize: 12 }}
            onClick={() => setCaption(idea)}
          >
            {idea}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() =>
            setIdeas([captionForTime(locale), ...suggestCaptions(locale, 5)])
          }
        >
          ↻
        </button>
      </div>

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

      {dest === "friends" && (
        <>
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
        </>
      )}

      {dest === "story" && (
        <p className="muted" style={{ marginTop: 12 }}>
          {t("storyHint")}
        </p>
      )}
      {dest === "spotlight" && (
        <p className="muted" style={{ marginTop: 12 }}>
          {t("spotlightHint")}
        </p>
      )}

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={saveVault}
          onChange={(e) => setSaveVault(e.target.checked)}
        />
        <span>💾 {t("saveToMemories")}</span>
      </label>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 12 }}
        disabled={busy || (dest === "friends" && friends.length === 0)}
        onClick={() => void onSend()}
      >
        {busy
          ? t("loading")
          : dest === "story"
            ? t("postStory")
            : dest === "spotlight"
              ? t("postSpotlight")
              : `${t("send")} (${selected.size})`}
      </button>
    </div>
  );
}
