import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useInboxCount } from "@/hooks/useInboxCount";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { isMorePath, MoreSheet } from "@/components/MoreSheet";

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  ({
    flex: 1,
    textAlign: "center" as const,
    textDecoration: "none",
    color: isActive ? "var(--accent)" : "var(--muted)",
    fontSize: 10,
    fontWeight: isActive ? 700 : 500,
    padding: "6px 2px",
    position: "relative" as const,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  }) as const;

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: -6,
        right: -10,
        minWidth: 16,
        height: 16,
        borderRadius: 999,
        background: "var(--accent)",
        color: "#000",
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
 * Secondary destinations live in the More sheet (Map, Discover, Me, …).
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
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "flex-end",
          background: "#000",
          borderTop: "1px solid var(--border)",
          paddingBottom: "var(--safe-bottom)",
          zIndex: 40,
        }}
        aria-label={t("mainNav")}
      >
        <NavLink to="/friends" style={linkStyle}>
          👥
          <div>{t("friends")}</div>
        </NavLink>

        <NavLink to="/chats" style={linkStyle}>
          <span style={{ position: "relative", display: "inline-block" }}>
            💬
            <Badge n={chatCount} />
          </span>
          <div>{t("chats")}</div>
        </NavLink>

        <NavLink
          to="/app"
          end
          style={({ isActive }) => ({
            ...linkStyle({ isActive }),
            marginTop: -10,
          })}
        >
          <span
            style={{
              display: "inline-flex",
              width: 48,
              height: 48,
              borderRadius: "50%",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--accent)",
              color: "#000",
              fontSize: 22,
              boxShadow: "0 0 0 3px #000, 0 0 0 5px var(--accent)",
            }}
            aria-hidden
          >
            📷
          </span>
          <div style={{ marginTop: 2 }}>{t("camera")}</div>
        </NavLink>

        <NavLink to="/app/inbox" style={linkStyle}>
          <span style={{ position: "relative", display: "inline-block" }}>
            📬
            <Badge n={snapCount} />
          </span>
          <div>{t("inbox")}</div>
        </NavLink>

        <button
          type="button"
          style={linkStyle({ isActive: moreActive || moreOpen })}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        >
          ☰
          <div>{t("more")}</div>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
