import { useLang } from "./LanguageContext";

export default function LanguageToggle({ style }) {
  const { lang, changeLang } = useLang();
  const nextLanguage = lang === "es" ? "en" : "es";
  const nextLanguageLabel =
    nextLanguage === "es" ? "Español" : "English";
  const accessibleLabel = lang === "es"
    ? `Cambiar idioma a ${nextLanguageLabel}`
    : `Change language to ${nextLanguageLabel}`;

  return (
    <button
      type="button"
      onClick={() => changeLang(nextLanguage)}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 38,
        padding: "7px 11px",
        gap: 7,
        border: "1px solid #303747",
        borderRadius: 9,
        background: "#171a22",
        color: "#e6edf3",
        fontWeight: 800,
        whiteSpace: "nowrap",
        cursor: "pointer",
        ...style
      }}
    >
      <span aria-hidden="true">🌐</span>
      <span>{nextLanguageLabel}</span>
    </button>
  );
}
