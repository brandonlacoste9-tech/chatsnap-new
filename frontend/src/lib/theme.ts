export type PaletteId =
  | "sunny"
  | "hotpink"
  | "cyan"
  | "lime"
  | "orange"
  | "purple"
  | "ice"
  | "rose";

export type EdgeMode = "off" | "soft" | "pulse" | "rainbow";

export type Palette = {
  id: PaletteId;
  /** CSS accent */
  accent: string;
  accentInk: string;
  /** Glow / edge tint */
  glow: string;
  /** Elevated surface tint */
  elevated: string;
};

export const PALETTES: Palette[] = [
  {
    id: "sunny",
    accent: "#fffc00",
    accentInk: "#0a0a0a",
    glow: "#fffc00",
    elevated: "#1a1800",
  },
  {
    id: "hotpink",
    accent: "#ff2d95",
    accentInk: "#0a0a0a",
    glow: "#ff2d95",
    elevated: "#1a0812",
  },
  {
    id: "cyan",
    accent: "#00f0ff",
    accentInk: "#0a0a0a",
    glow: "#00f0ff",
    elevated: "#001618",
  },
  {
    id: "lime",
    accent: "#3dff9a",
    accentInk: "#0a0a0a",
    glow: "#3dff9a",
    elevated: "#061a10",
  },
  {
    id: "orange",
    accent: "#ff9500",
    accentInk: "#0a0a0a",
    glow: "#ff9500",
    elevated: "#1a1000",
  },
  {
    id: "purple",
    accent: "#c084fc",
    accentInk: "#0a0a0a",
    glow: "#a855f7",
    elevated: "#12081a",
  },
  {
    id: "ice",
    accent: "#e8f1ff",
    accentInk: "#0a0a0a",
    glow: "#93c5fd",
    elevated: "#0c121a",
  },
  {
    id: "rose",
    accent: "#fda4af",
    accentInk: "#0a0a0a",
    glow: "#fb7185",
    elevated: "#1a0a0e",
  },
];

const PALETTE_KEY = "chatsnap_palette_v1";
const EDGE_KEY = "chatsnap_edge_v1";

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

export function loadPaletteId(): PaletteId {
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    if (v && PALETTES.some((p) => p.id === v)) return v as PaletteId;
  } catch {
    /* ignore */
  }
  return "sunny";
}

export function loadEdgeMode(): EdgeMode {
  try {
    const v = localStorage.getItem(EDGE_KEY);
    if (v === "off" || v === "soft" || v === "pulse" || v === "rainbow") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "soft";
}

export function applyTheme(paletteId: PaletteId, edge: EdgeMode): void {
  const p = getPalette(paletteId);
  const root = document.documentElement;
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-ink", p.accentInk);
  root.style.setProperty("--glow", p.glow);
  root.style.setProperty("--bg-elevated", p.elevated);
  root.style.setProperty(
    "--edge-rgb",
    hexToRgbTriplet(p.glow) ?? "255, 252, 0",
  );
  root.dataset.palette = paletteId;
  root.dataset.edge = edge;
  try {
    localStorage.setItem(PALETTE_KEY, paletteId);
    localStorage.setItem(EDGE_KEY, edge);
  } catch {
    /* ignore */
  }
  // Keep PWA theme-color in sync
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#0a0a0a");
}

function hexToRgbTriplet(hex: string): string | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `${r}, ${g}, ${b}`;
}
