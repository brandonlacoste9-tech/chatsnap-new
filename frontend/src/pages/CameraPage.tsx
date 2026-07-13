import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera, type CaptureResult } from "@/hooks/useCamera";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export function CameraPage() {
  const t = useT();
  const navigate = useNavigate();
  const cam = useCamera();
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function goSend(cap: CaptureResult) {
    navigate("/send", { state: cap });
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
        if (cap) goSend(cap);
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
        // Keep taps on camera controls, not parent swipe
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

      {/* Dark overlay when no stream so UI is readable */}
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
          <p style={{ margin: 0, fontWeight: 700 }}>{t("camera")}</p>
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
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 5,
          pointerEvents: "auto",
        }}
      >
        <div className="brand" style={{ fontSize: 18 }}>
          Chat<span>Snap</span>
        </div>
        <LanguageToggle />
      </div>

      {/* Controls — high z-index above bottom nav */}
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 50,
          paddingBottom: 8,
          pointerEvents: "auto",
        }}
      >
        {msg && (
          <p
            style={{
              margin: 0,
              background: "rgba(0,0,0,0.7)",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              color: "#ffb4b4",
            }}
          >
            {msg}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
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
          >
            🖼
          </button>
        </div>

        {/* Big labeled shutter */}
        <button
          type="button"
          disabled={busy || (mode === "video" && !cam.ready && !cam.recording)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onShutter();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={t("camera")}
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            border: "5px solid var(--accent)",
            background: cam.recording ? "var(--danger)" : "var(--accent)",
            color: "#0a0a0a",
            fontWeight: 800,
            fontSize: 13,
            boxShadow: "0 0 0 6px rgba(0,0,0,0.45)",
            cursor: "pointer",
            touchAction: "manipulation",
            display: "grid",
            placeItems: "center",
            lineHeight: 1.1,
            opacity: busy ? 0.6 : 1,
          }}
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

      {/* Native camera / gallery — most reliable on phones */}
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
