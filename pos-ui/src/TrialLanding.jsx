import { useLang } from "./LanguageContext";

const palette = {
  bg: "#0b0d12",
  panel: "#171a22",
  panelAlt: "#202532",
  text: "#f5f7fb",
  muted: "#a8b0c2",
  border: "#303747",
  blue: "#3ba4f7",
  orange: "#ff8a3d",
};

export default function TrialLanding({ onStart, onLogin }) {
  const { t } = useLang();

  const features = [
    ["✓", t("trial_landing_feature_sales")],
    ["✓", t("trial_landing_feature_inventory")],
    ["✓", t("trial_landing_feature_reports")],
    ["✓", t("trial_landing_feature_offline")],
  ];

  return (
    <main style={{
      minHeight: "100dvh",
      background: `radial-gradient(circle at 85% 5%, rgba(59,164,247,.18), transparent 34%), ${palette.bg}`,
      color: palette.text,
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "clamp(20px, 5vw, 72px)",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <strong style={{ fontSize: 24, letterSpacing: ".04em" }}>VENDR</strong>
          <button onClick={onLogin} style={secondaryButton}>{t("login")}</button>
        </nav>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "clamp(28px, 6vw, 72px)",
          alignItems: "center",
          padding: "clamp(54px, 10vw, 120px) 0 56px",
        }}>
          <div>
            <div style={{ color: palette.orange, fontWeight: 800, marginBottom: 14 }}>
              {t("trial_landing_eyebrow")}
            </div>
            <h1 style={{ fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1.02, margin: "0 0 20px" }}>
              {t("trial_landing_heading")}
            </h1>
            <p style={{ color: palette.muted, fontSize: "clamp(18px, 2.3vw, 23px)", lineHeight: 1.55, margin: "0 0 28px", maxWidth: 660 }}>
              {t("trial_landing_subheading")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button onClick={onStart} style={primaryButton}>{t("start_free_trial")}</button>
              <span style={{ color: palette.muted, fontSize: 14 }}>{t("trial_landing_no_card")}</span>
            </div>
          </div>

          <div style={{
            background: "linear-gradient(145deg, rgba(32,37,50,.96), rgba(23,26,34,.96))",
            border: `1px solid ${palette.border}`,
            borderRadius: 20,
            padding: "clamp(22px, 4vw, 36px)",
            boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          }}>
            <h2 style={{ margin: "0 0 22px", fontSize: 24 }}>{t("trial_landing_included")}</h2>
            <div style={{ display: "grid", gap: 16 }}>
              {features.map(([icon, label]) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ color: palette.blue, fontWeight: 900 }}>{icon}</span>
                  <span style={{ lineHeight: 1.45 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${palette.border}`, marginTop: 24, paddingTop: 20, color: palette.muted, fontSize: 14 }}>
              {t("trial_landing_existing_data")}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const primaryButton = {
  border: 0,
  borderRadius: 10,
  background: "#3ba4f7",
  color: "#08111d",
  padding: "14px 22px",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #303747",
  borderRadius: 9,
  background: "#202532",
  color: "#f5f7fb",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};
