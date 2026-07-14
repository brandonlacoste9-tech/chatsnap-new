import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMemory, listMemories, type Memory } from "@/lib/memories";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

/** Your forever vault — Snapchat Memories, but yours and clear. */
export function MemoriesPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, demoMode } = useAuth();
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Memory | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await listMemories(user.id));
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    if (!user?.id) return;
    if (!confirm(t("deleteMemoryConfirm"))) return;
    const err = await deleteMemory(id, user.id);
    if (err) toast(err, "err");
    else {
      toast(t("deleted"), "ok");
      setOpen(null);
      void load();
    }
  }

  return (
    <div className="app-root">
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>💾 {t("memories")}</h2>
          <button type="button" className="chip" onClick={() => nav("/me")}>
            ← {t("me")}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("memoriesHint")}
        </p>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}
        {loading && <p className="muted">{t("loading")}</p>}
        {!loading && items.length === 0 && (
          <p className="muted">{t("noMemories")}</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            marginTop: 12,
          }}
        >
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpen(m)}
              style={{
                aspectRatio: "1",
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                padding: 0,
                background: "#111",
                cursor: "pointer",
              }}
            >
              {m.url && m.media_type === "image" ? (
                <img
                  src={m.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 28,
                  }}
                >
                  🎬
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(null)}
        >
          {open.url && open.media_type === "image" && (
            <img
              src={open.url}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {open.url && open.media_type === "video" && (
            <video
              src={open.url}
              controls
              style={{ maxWidth: "100%", maxHeight: "70vh" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {open.caption && (
            <p style={{ color: "#fff", fontWeight: 700, marginTop: 12 }}>
              {open.caption}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(null);
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={(e) => {
                e.stopPropagation();
                void onDelete(open.id);
              }}
            >
              {t("delete")}
            </button>
          </div>
        </div>
      )}

      <BottomChrome />
    </div>
  );
}
