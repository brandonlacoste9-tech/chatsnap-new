import { NavLink } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useInboxCount } from "@/hooks/useInboxCount";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

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

export function BottomChrome() {
  const t = useT();
  const { count: snapCount } = useInboxCount();
  const { count: chatCount } = useUnreadMessages();

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        background: "#000",
        borderTop: "1px solid var(--border)",
        paddingBottom: "var(--safe-bottom)",
        zIndex: 40,
      }}
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
      <NavLink to="/app" end style={linkStyle}>
        📷
        <div>{t("camera")}</div>
      </NavLink>
      <NavLink to="/app/inbox" style={linkStyle}>
        <span style={{ position: "relative", display: "inline-block" }}>
          📬
          <Badge n={snapCount} />
        </span>
        <div>{t("inbox")}</div>
      </NavLink>
      <NavLink to="/me" style={linkStyle}>
        🙂
        <div>{t("me")}</div>
      </NavLink>
    </nav>
  );
}
