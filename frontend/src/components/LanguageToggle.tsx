import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button
        type="button"
        className={`chip ${locale === "en" ? "active" : ""}`}
        onClick={() => setLocale("en")}
        aria-label={t("en")}
      >
        {t("en")}
      </button>
      <button
        type="button"
        className={`chip ${locale === "fr" ? "active" : ""}`}
        onClick={() => setLocale("fr")}
        aria-label={t("fr")}
      >
        {t("fr")}
      </button>
    </div>
  );
}
