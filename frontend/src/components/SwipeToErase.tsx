import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useT } from "@/lib/i18n";

const ACTION_W = 88;
const THRESHOLD = 56;

/**
 * Swipe left to reveal erase action (iOS-mail style).
 * Vertical scroll is preserved; small horizontal moves open the erase rail.
 */
export function SwipeToErase({
  children,
  onErase,
  disabled,
  label,
}: {
  children: ReactNode;
  onErase: () => void | Promise<void>;
  disabled?: boolean;
  /** Override erase button label */
  label?: string;
}) {
  const t = useT();
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const base = useRef(0);
  const axis = useRef<"x" | "y" | null>(null);
  const dragging = useRef(false);

  function clamp(n: number) {
    return Math.max(-ACTION_W, Math.min(0, n));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled || busy) return;
    dragging.current = true;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    base.current = dx;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const mx = e.clientX - startX.current;
    const my = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      axis.current = Math.abs(mx) > Math.abs(my) ? "x" : "y";
    }
    if (axis.current === "y") return;
    e.preventDefault();
    setDx(clamp(base.current + mx));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (axis.current === "y") {
      axis.current = null;
      return;
    }
    axis.current = null;
    setDx((cur) => (cur < -THRESHOLD ? -ACTION_W : 0));
  }

  async function doErase() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onErase();
      setDx(0);
    } finally {
      setBusy(false);
    }
  }

  const shell: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--radius)",
    touchAction: "pan-y",
  };

  const rail: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "stretch",
    pointerEvents: dx < -8 ? "auto" : "none",
  };

  const eraseBtn: CSSProperties = {
    width: ACTION_W,
    border: "none",
    background: "var(--danger)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.7 : 1,
  };

  const content: CSSProperties = {
    position: "relative",
    transform: `translateX(${dx}px)`,
    transition: dragging.current ? "none" : "transform 0.18s ease",
    background: "var(--bg)",
    zIndex: 1,
  };

  return (
    <div style={shell}>
      <div style={rail}>
        <button
          type="button"
          style={eraseBtn}
          disabled={busy || disabled}
          onClick={() => void doErase()}
        >
          {busy ? "…" : label ?? t("swipeErase")}
        </button>
      </div>
      <div
        style={content}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
