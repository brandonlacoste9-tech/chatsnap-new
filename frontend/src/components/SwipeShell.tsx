import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CameraPage } from "@/pages/CameraPage";
import { InboxPage } from "@/pages/InboxPage";

/** Horizontal scroll-snap between Camera (default) and Inbox — Snap-like. */
export function SwipeShell() {
  const scroller = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const wantInbox = location.pathname.includes("inbox");
    el.scrollTo({ left: wantInbox ? el.clientWidth : 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const page = el.scrollLeft > el.clientWidth * 0.5 ? "inbox" : "camera";
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
        // Prefer horizontal swipe; buttons use touch-action: manipulation
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
        }}
      >
        <InboxPage />
      </section>
    </div>
  );
}
