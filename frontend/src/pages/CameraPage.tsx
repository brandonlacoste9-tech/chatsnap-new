import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "@/hooks/useCamera";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export function CameraPage() {
  const t = useT();
  const navigate = useNavigate();
  const cam = useCamera();
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [busy, setBusy] = useState(false);

  async function onShutter() {
    setBusy(true);
    try {
      if (mode === "photo") {
        const cap = await cam.takePhoto();
        if (cap) {
          navigate("/send", { state: cap });
        }
      } else if (cam.recording) {
        const cap = await cam.stopRecording();
        if (cap) navigate("/send", { state: cap });
      } else {
        cam.startRecording();
        // auto-stop at 15s
        window.setTimeout(() => {
          void (async () => {
            if (cam.recording) {
              const cap = await cam.stopRecording();
              if (cap) navigate("/send", { state: cap });
            }
          })();
        }, 15000);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <video
        ref={cam.videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <div className="brand" style={{ fontSize: 18 }}>
          Chat<span>Snap</span>
        </div>
        <LanguageToggle />
      </div>

      {cam.error && (
        <div className="page-center" style={{ position: "absolute", inset: 0 }}>
          <p>{t("noCamera")}</p>
          <button type="button" className="btn btn-primary" onClick={() => void cam.restart()}>
            {t("retry")}
          </button>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 88,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
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
        </div>

        <button
          type="button"
          disabled={busy || !cam.ready}
          onClick={() => void onShutter()}
          aria-label={t("camera")}
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            border: "4px solid var(--accent)",
            background: cam.recording ? "var(--danger)" : "#111",
            boxShadow: "0 0 0 4px #000",
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}
