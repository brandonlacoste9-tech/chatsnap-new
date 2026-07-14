import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCamera, type CaptureResult } from "@/hooks/useCamera";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { hapticSnap } from "@/lib/haptics";

export function CameraPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storyMode = params.get("story") === "1";
  const cam = useCamera();
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function goSend(cap: CaptureResult) {
    const state = { ...cap, toStory: storyMode };
    // Photos → doodle/sticker editor; video → send directly
    if (cap.mediaType === "image") {
      navigate("/edit", { state });
    } else {
      navigate("/send", { state });
    }
  }

  async function onShutter() {
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "photo") {
        if (!cam.ready) {
          // Fallback: native camera / gallery
          fileRef.current?.click();
          return;
        }
        const cap = await cam.takePhoto();
        if (cap) {
          hapticSnap();
          goSend(cap);
        }
        else {
          setMsg(t("captureError"));
          fileRef.current?.click();
        }
      } else if (cam.recording) {
        const cap = await cam.stopRecording();
        if (cap) goSend(cap);
        else setMsg(t("captureError"));
      } else {
        if (!cam.ready) {
          setMsg(t("noCamera"));
          return;
        }
        cam.startRecording();
      }
    } finally {
      setBusy(false);
    }
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const mediaType = file.type.startsWith("video") ? "video" : "image";
    const cap: CaptureResult = {
      blob: file,
      mediaType,
      previewUrl: URL.createObjectURL(file),
    };
    goSend(cap);
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: "100%",
        background: "#000",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      <video
        ref={cam.videoRef}
        playsInline
        muted
        autoPlay
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: cam.facing === "user" ? "scaleX(-1)" : "none",
          background: "#111",
        }}
      />

      {!cam.ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 40%, #1a1a1a 0%, #0a0a0a 70%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 48 }}>📷</div>
          <p style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {t("camera")}
          </p>
          <p className="muted" style={{ margin: 0, maxWidth: 280 }}>
            {cam.error ? t("noCamera") : t("loading")}
          </p>
          {cam.error && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void cam.restart()}
            >
              {t("retry")}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            {t("gallery")}
          </button>
        </div>
      )}

      <div className="camera-chrome-top">
        <div className="brand" style={{ fontSize: 18 }}>
          Chat<span>Snap</span>
          {storyMode ? (
            <span
              style={{
                fontSize: 11,
                marginLeft: 8,
                color: "var(--accent)",
                fontWeight: 800,
                letterSpacing: 0.04,
              }}
            >
              · {t("myStory")}
            </span>
          ) : null}
        </div>
        <LanguageToggle />
      </div>

      <div className="camera-chrome-bottom">
        {msg && (
          <p
            style={{
              margin: 0,
              background: "rgba(0,0,0,0.75)",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              color: "#ffb4b4",
              border: "1px solid #442222",
            }}
          >
            {msg}
          </p>
        )}

        <div className="camera-mode-row">
          <button
            type="button"
            className={`chip ${mode === "photo" ? "active" : ""}`}
            onClick={() => setMode("photo")}
          >
            {t("photo")}
          </button>
          <button
            type="button"
            className={`chip ${mode === "video" ? "active" : ""}`}
            onClick={() => setMode("video")}
          >
            {t("video")}
          </button>
          <button type="button" className="chip" onClick={cam.flip}>
            {t("flip")}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => fileRef.current?.click()}
            aria-label={t("gallery")}
          >
            🖼
          </button>
        </div>

        <button
          type="button"
          className={`camera-shutter${cam.recording ? " recording" : ""}`}
          disabled={busy || (mode === "video" && !cam.ready && !cam.recording)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onShutter();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={t("camera")}
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {mode === "video"
            ? cam.recording
              ? t("stop")
              : t("record")
            : t("snapLabel")}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          style={{
            fontSize: 13,
            padding: "8px 16px",
            background: "rgba(0,0,0,0.55)",
            borderColor: "var(--accent)",
            color: "var(--accent)",
            touchAction: "manipulation",
          }}
          onClick={() => fileRef.current?.click()}
        >
          {t("gallery")}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture={mode === "photo" ? "environment" : undefined}
        style={{ display: "none" }}
        onChange={onFilePicked}
      />
    </div>
  );
}
