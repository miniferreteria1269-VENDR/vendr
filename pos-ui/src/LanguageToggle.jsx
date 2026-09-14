import { useLang } from "./LanguageContext";

export default function LanguageToggle({ style }) {
  const { lang, changeLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Language / Idioma"
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 2,
        border: "1px solid #303747",
        borderRadius: 9,
        background: "#171a22",
        ...style,
      }}
    >
      {["es", "en"].map(option => {
        const selected = lang === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => changeLang(option)}
            aria-pressed={selected}
            title={option === "es" ? "Español" : "English"}
            style={{
              minWidth: 42,
              padding: "7px 9px",
              border: 0,
              borderRadius: 6,
              background: selected ? "#3ba4f7" : "transparent",
              color: selected ? "#08111d" : "#c7cedb",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
