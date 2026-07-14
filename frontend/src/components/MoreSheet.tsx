import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useT } from "@/lib/i18n";
import { PALETTES, type EdgeMode, type PaletteId } from "@/lib/theme";

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

const EDGE_MODES: { id: EdgeMode; labelKey: "edgeOff" | "edgeSoft" | "edgePulse" | "edgeRainbow" }[] =
  [
    { id: "off", labelKey: "edgeOff" },
    { id: "soft", labelKey: "edgeSoft" },
    { id: "pulse", labelKey: "edgePulse" },
    { id: "rainbow", labelKey: "edgeRainbow" },
  ];

const PALETTE_LABELS: Record<PaletteId, string> = {
  sunny: "Sunny",
  hotpink: "Hot pink",
  cyan: "Cyan",
  lime: "Lime",
  orange: "Orange",
  purple: "Purple",
  ice: "Ice",
  rose: "Rose",
};

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
  const { paletteId, edgeMode, setPaletteId, setEdgeMode } = useTheme();
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

        {/* Colour palette */}
        <section className="more-theme-block" aria-labelledby="more-palette">
          <h3 id="more-palette" className="more-theme-heading">
            🎨 {t("colorPalette")}
          </h3>
          <p className="muted more-theme-hint">{t("colorPaletteHint")}</p>
          <div className="more-palette-row" role="listbox" aria-label={t("colorPalette")}>
            {PALETTES.map((p) => {
              const active = paletteId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={PALETTE_LABELS[p.id]}
                  className={`more-swatch ${active ? "active" : ""}`}
                  style={{
                    background: `linear-gradient(135deg, ${p.accent} 0%, ${p.glow} 100%)`,
                    boxShadow: active
                      ? `0 0 0 2px #000, 0 0 0 4px ${p.accent}`
                      : undefined,
                  }}
                  onClick={() => setPaletteId(p.id)}
                >
                  <span className="more-swatch-check" aria-hidden>
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Edge lighting */}
        <section className="more-theme-block" aria-labelledby="more-edge">
          <h3 id="more-edge" className="more-theme-heading">
            💡 {t("edgeLighting")}
          </h3>
          <p className="muted more-theme-hint">{t("edgeLightingHint")}</p>
          <div className="more-edge-row">
            {EDGE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chip ${edgeMode === m.id ? "active" : ""}`}
                onClick={() => setEdgeMode(m.id)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </section>

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
