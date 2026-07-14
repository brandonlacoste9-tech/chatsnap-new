import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CameraPage } from "@/pages/CameraPage";
import { InboxPage } from "@/pages/InboxPage";

/** Horizontal scroll-snap between Camera (default) and Inbox — Snap-like. */
export function SwipeShell() {
  const scroller = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  /** Ignore scroll→route updates while we programmatically jump panels. */
  const lockRef = useRef(false);

  const wantInbox = location.pathname.includes("inbox");

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const jump = () => {
      lockRef.current = true;
      const w = el.clientWidth || window.innerWidth;
      el.scrollTo({ left: wantInbox ? w : 0, behavior: "auto" });
      // release after layout settles
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          lockRef.current = false;
        });
      });
    };

    jump();
    // Retry once if width was 0 on first paint
    const t = window.setTimeout(jump, 60);
    return () => window.clearTimeout(t);
  }, [wantInbox]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (lockRef.current) return;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        if (lockRef.current) return;
        const w = el.clientWidth;
        if (w < 10) return;
        const page = el.scrollLeft > w * 0.5 ? "inbox" : "camera";
        const path = page === "inbox" ? "/app/inbox" : "/app";
        if (location.pathname !== path) {
          navigate(path, { replace: true });
        }
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [location.pathname, navigate]);

  return (
    <div
      ref={scroller}
      style={{
        display: "flex",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        height: "100%",
        width: "100%",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x",
      }}
    >
      <section
        style={{
          minWidth: "100%",
          height: "100%",
          scrollSnapAlign: "start",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CameraPage />
      </section>
      <section
        style={{
          minWidth: "100%",
          height: "100%",
          scrollSnapAlign: "start",
          flexShrink: 0,
          overflowY: "auto",
          // allow vertical scroll on inbox list
          touchAction: "pan-y",
        }}
      >
        <InboxPage />
      </section>
    </div>
  );
}
