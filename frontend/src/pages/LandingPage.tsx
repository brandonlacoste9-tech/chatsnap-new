import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingDone } from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

const FEATURES = [
  { icon: "🔒", titleKey: "landFeat1Title", bodyKey: "landFeat1Body" },
  { icon: "🌐", titleKey: "landFeat2Title", bodyKey: "landFeat2Body" },
  { icon: "👻", titleKey: "landFeat3Title", bodyKey: "landFeat3Body" },
  { icon: "🗺️", titleKey: "landFeat4Title", bodyKey: "landFeat4Body" },
] as const;

const STEPS = [
  { n: "1", titleKey: "landStep1Title", bodyKey: "landStep1Body" },
  { n: "2", titleKey: "landStep2Title", bodyKey: "landStep2Body" },
  { n: "3", titleKey: "landStep3Title", bodyKey: "landStep3Body" },
] as const;

/**
 * Public marketing root — value first, then auth.
 * Logged-in users with a username skip straight into the app.
 */
export function LandingPage() {
  const t = useT();
  const { ready, session, profile, demoMode } = useAuth();

  if (!ready) {
    return (
      <div className="page-center">
        <p className="muted">{t("loading")}</p>
      </div>
    );
  }

  const signedIn =
    (demoMode || !!session) && !!profile?.username;
  if (signedIn) {
    return (
      <Navigate
        to={isOnboardingDone() ? "/app" : "/onboarding"}
        replace
      />
    );
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="brand" style={{ fontSize: 22 }}>
          Chat<span>Snap</span>
        </div>
        <div className="landing-header-actions">
          <LanguageToggle />
          <Link to="/auth" className="btn btn-ghost landing-header-login">
            {t("login")}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="landing-hero">
          <p className="landing-kicker">{t("brandLine")}</p>
          <h1 className="landing-title">{t("landHeroTitle")}</h1>
          <p className="landing-lead">{t("landHeroBody")}</p>
          <div className="landing-cta-row">
            <Link
              to="/auth"
              state={{ mode: "signup" as const }}
              className="btn btn-primary landing-cta"
            >
              {t("landGetStarted")}
            </Link>
            <Link to="/auth" className="btn btn-ghost landing-cta">
              {t("login")}
            </Link>
          </div>
          <p className="muted landing-micro">{t("landHeroMicro")}</p>
        </section>

        {/* Features */}
        <section className="landing-section" aria-labelledby="land-features">
          <h2 id="land-features" className="landing-h2">
            {t("landFeaturesTitle")}
          </h2>
          <div className="landing-grid">
            {FEATURES.map((f) => (
              <article key={f.titleKey} className="landing-card">
                <div className="landing-card-icon" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="landing-card-title">{t(f.titleKey)}</h3>
                <p className="muted landing-card-body">{t(f.bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section" aria-labelledby="land-how">
          <h2 id="land-how" className="landing-h2">
            {t("landHowTitle")}
          </h2>
          <ol className="landing-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="landing-step">
                <span className="landing-step-n" aria-hidden>
                  {s.n}
                </span>
                <div>
                  <h3 className="landing-card-title">{t(s.titleKey)}</h3>
                  <p className="muted landing-card-body">{t(s.bodyKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy strip */}
        <section className="landing-privacy" aria-labelledby="land-safe">
          <h2 id="land-safe" className="landing-h2" style={{ marginBottom: 8 }}>
            {t("landSafeTitle")}
          </h2>
          <p className="muted" style={{ margin: "0 auto", maxWidth: 480 }}>
            {t("landSafeBody")}
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="landing-bottom-cta">
          <h2 className="landing-title" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
            {t("landBottomTitle")}
          </h2>
          <p className="muted" style={{ margin: "0 0 1.25rem" }}>
            {t("landBottomBody")}
          </p>
          <Link
            to="/auth"
            state={{ mode: "signup" as const }}
            className="btn btn-primary landing-cta"
          >
            {t("landGetStarted")}
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="brand" style={{ fontSize: 16 }}>
          Chat<span>Snap</span>
        </div>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
          {t("landFooterTag")}
        </p>
        <nav className="landing-footer-nav" aria-label={t("landLegalNav")}>
          <Link to="/privacy">{t("privacy")}</Link>
          <Link to="/terms">{t("terms")}</Link>
          <a href="mailto:hello@chatsnap.app">{t("contact")}</a>
        </nav>
        <p className="muted" style={{ margin: "16px 0 0", fontSize: 12 }}>
          {t("landCopyright")}
        </p>
      </footer>
    </div>
  );
}
