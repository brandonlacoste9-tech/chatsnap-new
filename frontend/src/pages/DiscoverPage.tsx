import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  listSpotlight,
  toggleSpotlightLike,
  type SpotlightPost,
} from "@/lib/spotlight";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

export function DiscoverPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, demoMode, profile } = useAuth();
  const restricted = Boolean(profile?.restricted_mode);
  const [posts, setPosts] = useState<SpotlightPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || demoMode || restricted) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setPosts(await listSpotlight(user.id));
    setLoading(false);
  }, [user?.id, demoMode, restricted]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onLike(p: SpotlightPost) {
    if (!user?.id) return;
    const res = await toggleSpotlightLike(p.id, user.id, Boolean(p.likedByMe));
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              like_count: res.like_count ?? x.like_count,
            }
          : x,
      ),
    );
  }

  return (
    <div className="app-root">
      <div className="page" style={{ paddingBottom: 100 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>✨ {t("discover")}</h2>
          <button type="button" className="chip" onClick={() => void load()}>
            {t("refresh")}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("discoverHint")}
        </p>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}
        {restricted && (
          <div className="banner">{t("restrictedDiscover")}</div>
        )}
        {loading && !restricted && <p className="muted">{t("loading")}</p>}
        {!restricted && !loading && posts.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <h3 className="empty-state-title">{t("emptySpotlight")}</h3>
            <p className="empty-state-body muted">{t("discoverHint")}</p>
            <div className="empty-state-action">
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() => nav("/app")}
              >
                {t("camera")} → {t("spotlight")}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {!restricted &&
            posts.map((p) => (
            <article
              key={p.id}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                }}
              >
                <div className="avatar" style={{ width: 36, height: 36 }}>
                  {(p.author?.username?.[0] ?? "?").toUpperCase()}
                </div>
                <strong style={{ flex: 1 }}>
                  @{p.author?.username ?? "…"}
                </strong>
                <span className="muted" style={{ fontSize: 11 }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>

              {p.url && p.media_type === "image" && (
                <img
                  src={p.url}
                  alt=""
                  style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
                />
              )}
              {p.url && p.media_type === "video" && (
                <video
                  src={p.url}
                  controls
                  playsInline
                  style={{ width: "100%", maxHeight: 420 }}
                />
              )}

              <div style={{ padding: "10px 12px" }}>
                {p.caption && (
                  <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{p.caption}</p>
                )}
                {p.caption_2 && (
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--accent)",
                    }}
                  >
                    {p.caption_2}
                  </p>
                )}
                <button
                  type="button"
                  className="chip"
                  style={{
                    background: p.likedByMe ? "var(--accent)" : undefined,
                    color: p.likedByMe ? "#000" : undefined,
                  }}
                  onClick={() => void onLike(p)}
                >
                  🔥 {p.like_count}
                </button>
              </div>
            </article>
            ))}
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
