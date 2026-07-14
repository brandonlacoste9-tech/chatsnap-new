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
import { translateText } from "@/lib/translate";
import { useI18n, useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import type { CaptureResult } from "@/hooks/useCamera";

/** seconds; 0 = open until they close (no auto timer) */
const DURATIONS = [3, 5, 10, 15, 30, 0] as const;

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
  const [duration, setDuration] = useState(10);
  const [caption, setCaption] = useState("");
  const [caption2, setCaption2] = useState("");
  // Bilingual default: dual panel open for ChatSnap crews
  const [showDual, setShowDual] = useState(true);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideas2, setIdeas2] = useState<string[]>([]);
  const [dest, setDest] = useState<Dest>(
    capture?.toStory ? "story" : "friends",
  );
  const [saveVault, setSaveVault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const otherLocale = locale === "fr" ? "en" : "fr";

  function swapCaptions() {
    setCaption(caption2);
    setCaption2(caption);
  }

  async function autoTranslateToOther() {
    if (!caption.trim()) {
      toast(t("captionEmpty"), "info");
      return;
    }
    setTranslating(true);
    const res = await translateText(caption.trim(), otherLocale);
    setTranslating(false);
    if (!res) {
      toast(t("translateFail"), "err");
      return;
    }
    setCaption2(res.text.slice(0, 80));
    setShowDual(true);
    toast(t("dualTranslated"), "ok");
  }

  useEffect(() => {
    if (!capture) {
      nav("/app", { replace: true });
      return;
    }
    if (capture.toStory) setDest("story");
    setIdeas([captionForTime(locale), ...suggestCaptions(locale, 5)]);
    setIdeas2([captionForTime(otherLocale), ...suggestCaptions(otherLocale, 5)]);
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
  }, [capture, user?.id, profile?.id, demoMode, nav, locale, otherLocale]);

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

    const cap1 = caption.trim() || undefined;
    const cap2 = showDual ? caption2.trim() || undefined : undefined;

    let err: string | null = null;
    if (dest === "story") {
      err = await publishStory({
        userId: senderId,
        blob,
        mediaType: capture.mediaType,
        caption: cap1,
        caption2: cap2,
        durationSec: duration,
      });
    } else if (dest === "spotlight") {
      err = await publishSpotlight({
        userId: senderId,
        blob,
        mediaType: capture.mediaType,
        caption: cap1,
        caption2: cap2,
      });
    } else {
      err = await sendSnap({
        senderId,
        blob,
        mediaType: capture.mediaType,
        durationSec: duration,
        recipientIds: [...selected],
        caption: cap1,
        caption2: cap2,
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
        caption: cap1,
        caption2: cap2,
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button type="button" className="chip" onClick={() => nav(-1)}>
          ← {t("retake")}
        </button>
        <h2 className="page-title" style={{ margin: 0, flex: 1, textAlign: "center" }}>
          {dest === "story"
            ? t("myStory")
            : dest === "spotlight"
              ? t("spotlight")
              : t("sendTo")}
        </h2>
        <span style={{ width: 72 }} aria-hidden />
      </div>

      {capture.mediaType === "image" ? (
        <img
          src={capture.previewUrl}
          alt=""
          style={{
            width: "100%",
            maxHeight: 260,
            objectFit: "cover",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 0 24px rgba(var(--edge-rgb), 0.12)",
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

      <div
        className="list-row"
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
          marginTop: 12,
          borderColor: showDual ? "var(--accent)" : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 14 }}>🌐 {t("dualCaptionTitle")}</strong>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${showDual ? "active" : ""}`}
              onClick={() => setShowDual((v) => !v)}
            >
              {showDual ? t("dualCaptionOn") : t("dualCaptionAdd")}
            </button>
            <button
              type="button"
              className="chip"
              disabled={!caption.trim() && !caption2.trim()}
              onClick={swapCaptions}
              title={t("dualSwap")}
            >
              ⇄
            </button>
            <button
              type="button"
              className="chip"
              disabled={busy || translating || !caption.trim()}
              onClick={() => void autoTranslateToOther()}
            >
              {translating ? "…" : `EN⇄FR`}
            </button>
          </div>
        </div>

        <label className="muted" style={{ display: "block", fontSize: 12 }}>
          {t("caption")} · {locale.toUpperCase()}
        </label>
        <input
          className="field"
          placeholder={t("captionPlaceholder")}
          value={caption}
          maxLength={80}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 11, width: "100%" }}>
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

        {showDual && (
          <>
            <label
              className="muted"
              style={{ display: "block", fontSize: 12, marginTop: 4 }}
            >
              {t("caption2")} · {otherLocale.toUpperCase()}
            </label>
            <input
              className="field"
              placeholder={t("caption2Placeholder")}
              value={caption2}
              maxLength={80}
              onChange={(e) => setCaption2(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ideas2.map((idea) => (
                <button
                  key={`2-${idea}`}
                  type="button"
                  className="chip"
                  style={{ fontSize: 12 }}
                  onClick={() => setCaption2(idea)}
                >
                  {idea}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                onClick={() =>
                  setIdeas2([
                    captionForTime(otherLocale),
                    ...suggestCaptions(otherLocale, 5),
                  ])
                }
              >
                ↻
              </button>
            </div>
          </>
        )}

        {(caption || caption2) && (
          <div
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 12,
              background: "#0a0a0a",
              border: "1px dashed #333",
              textAlign: "center",
            }}
          >
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
              {t("dualPreview")}
            </div>
            {caption && (
              <div style={{ fontWeight: 800, fontSize: 15 }}>{caption}</div>
            )}
            {showDual && caption2 && (
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--accent)",
                  marginTop: 4,
                }}
              >
                {caption2}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="muted" style={{ marginBottom: 4 }}>
        {t("duration")} ·{" "}
        <strong style={{ color: "var(--accent)" }}>
          {duration === 0 ? t("durationOpen") : `${duration}${t("seconds")}`}
        </strong>
      </p>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        {t("durationHint")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            className={`chip ${duration === d ? "active" : ""}`}
            onClick={() => setDuration(d)}
          >
            {d === 0 ? t("durationOpen") : `${d}${t("seconds")}`}
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
