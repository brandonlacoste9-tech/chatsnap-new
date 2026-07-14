import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

export type MoreItem = {
  path: string;
  icon: string;
  labelKey:
    | "me"
    | "snapMap"
    | "discover"
    | "groups"
    | "memories"
    | "myStickers"
    | "hives"
    | "friends";
  hideIfRestricted?: boolean;
};

const ITEMS: MoreItem[] = [
  { path: "/me", icon: "🙂", labelKey: "me" },
  { path: "/hives", icon: "🐝", labelKey: "hives" },
  { path: "/groups", icon: "👨‍👩‍👧‍👦", labelKey: "groups" },
  { path: "/memories", icon: "💾", labelKey: "memories" },
  { path: "/stickers", icon: "🖼️", labelKey: "myStickers" },
  { path: "/map", icon: "🗺️", labelKey: "snapMap", hideIfRestricted: true },
  {
    path: "/discover",
    icon: "✨",
    labelKey: "discover",
    hideIfRestricted: true,
  },
];

export function MoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const nav = useNavigate();
  const { profile } = useAuth();
  const restricted = Boolean(profile?.restricted_mode);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const visible = ITEMS.filter((it) => !(it.hideIfRestricted && restricted));

  return (
    <div
      className="more-sheet-root"
      role="dialog"
      aria-modal="true"
      aria-label={t("more")}
    >
      <button
        type="button"
        className="more-sheet-backdrop"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="more-sheet-panel">
        <div className="more-sheet-handle" aria-hidden />
        <div className="more-sheet-title-row">
          <h2 className="more-sheet-title">{t("more")}</h2>
          <button type="button" className="chip" onClick={onClose}>
            {t("close")}
          </button>
        </div>
        <div className="more-sheet-grid">
          {visible.map((it) => (
            <button
              key={it.path}
              type="button"
              className="more-sheet-item"
              onClick={() => {
                onClose();
                nav(it.path);
              }}
            >
              <span className="more-sheet-icon" aria-hidden>
                {it.icon}
              </span>
              <span>{t(it.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Paths that live under the More sheet (for active tab highlight). */
export function isMorePath(pathname: string): boolean {
  return (
    pathname === "/me" ||
    pathname === "/hives" ||
    pathname.startsWith("/group") ||
    pathname === "/groups" ||
    pathname === "/memories" ||
    pathname === "/stickers" ||
    pathname === "/map" ||
    pathname === "/discover"
  );
}
