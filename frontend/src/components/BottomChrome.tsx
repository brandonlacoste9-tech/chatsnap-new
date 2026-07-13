import { NavLink } from "react-router-dom";
import { useT } from "@/lib/i18n";

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  ({
    flex: 1,
    textAlign: "center" as const,
    textDecoration: "none",
    color: isActive ? "var(--accent)" : "var(--muted)",
    fontSize: 11,
    fontWeight: isActive ? 700 : 500,
    padding: "8px 4px",
  }) as const;

export function BottomChrome() {
  const t = useT();
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
      <NavLink to="/app" end style={linkStyle}>
        📷
        <div>{t("camera")}</div>
      </NavLink>
      <NavLink to="/app/inbox" style={linkStyle}>
        📬
        <div>{t("inbox")}</div>
      </NavLink>
      <NavLink to="/me" style={linkStyle}>
        🙂
        <div>{t("me")}</div>
      </NavLink>
    </nav>
  );
}
