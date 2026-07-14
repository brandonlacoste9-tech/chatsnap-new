import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useInboxCount } from "@/hooks/useInboxCount";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { isMorePath, MoreSheet } from "@/components/MoreSheet";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: -4,
        right: -10,
        minWidth: 16,
        height: 16,
        borderRadius: 999,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        fontSize: 10,
        fontWeight: 800,
        lineHeight: "16px",
        padding: "0 4px",
      }}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * Primary nav: Friends · Chats · Camera · Inbox · More
 */
export function BottomChrome() {
  const t = useT();
  const loc = useLocation();
  const { count: snapCount } = useInboxCount();
  const { count: chatCount } = useUnreadMessages();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMorePath(loc.pathname);

  return (
    <>
      <nav className="bottom-nav" aria-label={t("mainNav")}>
        <NavLink
          to="/friends"
          className={({ isActive }) =>
            `bottom-nav-link${isActive ? " active" : ""}`
          }
        >
          <span className="nav-emoji" aria-hidden>
            👥
          </span>
          <span>{t("friends")}</span>
        </NavLink>

        <NavLink
          to="/chats"
          className={({ isActive }) =>
            `bottom-nav-link${isActive ? " active" : ""}`
          }
        >
          <span className="nav-emoji" style={{ position: "relative" }} aria-hidden>
            💬
            <Badge n={chatCount} />
          </span>
          <span>{t("chats")}</span>
        </NavLink>

        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `bottom-nav-link${isActive ? " active" : ""}`
          }
          style={{ marginTop: -12 }}
        >
          <span
            className="nav-emoji"
            style={{
              display: "inline-flex",
              width: 48,
              height: 48,
              borderRadius: "50%",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: 22,
              boxShadow:
                "0 0 0 3px #000, 0 0 0 5px var(--accent), 0 4px 16px rgba(var(--edge-rgb), 0.35)",
            }}
            aria-hidden
          >
            📷
          </span>
          <span style={{ marginTop: 2 }}>{t("camera")}</span>
        </NavLink>

        <NavLink
          to="/app/inbox"
          className={({ isActive }) =>
            `bottom-nav-link${isActive ? " active" : ""}`
          }
        >
          <span className="nav-emoji" style={{ position: "relative" }} aria-hidden>
            📬
            <Badge n={snapCount} />
          </span>
          <span>{t("inbox")}</span>
        </NavLink>

        <button
          type="button"
          className={`bottom-nav-link${moreActive || moreOpen ? " active" : ""}`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        >
          <span className="nav-emoji" aria-hidden>
            ☰
          </span>
          <span>{t("more")}</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
