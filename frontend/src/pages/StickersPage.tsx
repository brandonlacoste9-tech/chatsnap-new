import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteSticker,
  listMyStickers,
  uploadSticker,
  type UserSticker,
} from "@/lib/stickers";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

/** Build your own sticker pack — better than one-size-fits-all Bitmoji. */
export function StickersPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, demoMode } = useAuth();
  const [items, setItems] = useState<UserSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await listMyStickers(user.id));
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;
    // Downscale to sticker-ish size
    const bitmap = await createImageBitmap(file);
    const max = 256;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/png"),
    );
    if (!blob) return;
    const err = await uploadSticker(user.id, blob);
    if (err) toast(err, "err");
    else {
      toast(t("stickerAdded"), "ok");
      void load();
    }
  }

  return (
    <div className="app-root">
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>🖼️ {t("myStickers")}</h2>
          <button type="button" className="chip" onClick={() => nav("/me")}>
            ←
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("stickersHint")}
        </p>

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 8 }}
          disabled={demoMode}
          onClick={() => fileRef.current?.click()}
        >
          + {t("addSticker")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void onFile(e)}
        />

        {loading && <p className="muted">{t("loading")}</p>}
        {!loading && items.length === 0 && (
          <p className="muted">{t("noCustomStickers")}</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginTop: 16,
          }}
        >
          {items.map((s) => (
            <div
              key={s.id}
              style={{
                aspectRatio: "1",
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "#111",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {s.url && (
                <img
                  src={s.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 6,
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (!user?.id) return;
                  if (!confirm(t("delete"))) return;
                  void deleteSticker(s.id, user.id).then((err) => {
                    if (err) toast(err, "err");
                    else void load();
                  });
                }}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  border: "none",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
