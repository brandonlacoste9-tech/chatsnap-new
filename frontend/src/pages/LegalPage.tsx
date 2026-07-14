import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

type Kind = "privacy" | "terms";

export function LegalPage({ kind }: { kind: Kind }) {
  const t = useT();
  const title = kind === "privacy" ? t("privacyTitle") : t("termsTitle");
  const body = kind === "privacy" ? t("privacyBody") : t("termsBody");

  return (
    <div className="landing" style={{ minHeight: "100%" }}>
      <header className="landing-header">
        <Link to="/" className="brand" style={{ fontSize: 22, textDecoration: "none" }}>
          Chat<span>Snap</span>
        </Link>
        <div className="landing-header-actions">
          <LanguageToggle />
          <Link to="/auth" className="btn btn-ghost landing-header-login">
            {t("login")}
          </Link>
        </div>
      </header>

      <main className="landing-section" style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 1rem", fontSize: 28 }}>{title}</h1>
        <p className="muted" style={{ whiteSpace: "pre-line", lineHeight: 1.65, margin: 0 }}>
          {body}
        </p>
        <p style={{ marginTop: 28 }}>
          <Link to="/" className="btn btn-ghost">
            ← {t("back")}
          </Link>
        </p>
      </main>
    </div>
  );
}
