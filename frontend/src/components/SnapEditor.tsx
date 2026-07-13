import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useT } from "@/lib/i18n";

const STICKERS = ["🔥", "😂", "❤️", "💀", "✨", "🇨🇦", "👀", "🎉", "❄️", "👑"];

type Mode = "draw" | "sticker";

export type SnapEditorProps = {
  imageUrl: string;
  onDone: (blob: Blob, previewUrl: string) => void;
  onSkip: () => void;
  onRetake: () => void;
};

/**
 * Draw + emoji stickers on a photo, export flattened JPEG.
 */
export function SnapEditor({
  imageUrl,
  onDone,
  onSkip,
  onRetake,
}: SnapEditorProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState("#FFFC00");
  const [sticker, setSticker] = useState(STICKERS[0]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const baseRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      baseRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = Math.min(1080, img.naturalWidth || 720);
      const scale = maxW / (img.naturalWidth || maxW);
      canvas.width = Math.round((img.naturalWidth || maxW) * scale);
      canvas.height = Math.round((img.naturalHeight || 1280) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setReady(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  function pos(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    return { x, y };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);

    if (mode === "sticker") {
      const size = Math.max(32, canvas.width * 0.08);
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker, p.x, p.y);
      return;
    }

    drawing.current = true;
    last.current = p;
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || mode !== "draw") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !last.current) return;
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, canvas.width * 0.008);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function onPointerUp() {
    drawing.current = false;
    last.current = null;
  }

  function clearDraw() {
    const canvas = canvasRef.current;
    const img = baseRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  async function exportDone() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) return;
    onDone(blob, URL.createObjectURL(blob));
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 12,
          gap: 8,
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onRetake}>
          ← {t("retake")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          {t("skipEdit")}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: 8 }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            maxHeight: "55vh",
            borderRadius: 16,
            touchAction: "none",
            background: "#111",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`chip ${mode === "draw" ? "active" : ""}`}
            onClick={() => setMode("draw")}
          >
            ✏️ {t("draw")}
          </button>
          <button
            type="button"
            className={`chip ${mode === "sticker" ? "active" : ""}`}
            onClick={() => setMode("sticker")}
          >
            😀 {t("stickers")}
          </button>
          <button type="button" className="chip" onClick={clearDraw}>
            {t("clear")}
          </button>
        </div>

        {mode === "draw" && (
          <div style={{ display: "flex", gap: 8 }}>
            {["#FFFC00", "#ff2d95", "#00f0ff", "#ffffff", "#000000"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "3px solid #fff" : "2px solid #333",
                }}
                aria-label={c}
              />
            ))}
          </div>
        )}

        {mode === "sticker" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${sticker === s ? "active" : ""}`}
                style={{ fontSize: 20, minWidth: 44 }}
                onClick={() => setSticker(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!ready}
          onClick={() => void exportDone()}
        >
          {t("next")} →
        </button>
      </div>
    </div>
  );
}
