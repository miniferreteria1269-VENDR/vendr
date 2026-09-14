import { useState } from "react";
import { useLang } from "./LanguageContext";

export default function TrialOnboarding({ storeId, onNavigate }) {
  const { t } = useLang();
  const storageKey = `vendr_trial_onboarding_dismissed_${storeId}`;
  const [open, setOpen] = useState(() => localStorage.getItem(storageKey) !== "1");

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  };

  const go = (view) => {
    onNavigate(view);
    dismiss();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="trial-welcome-title" style={backdrop}>
      <section style={card}>
        <button type="button" onClick={dismiss} aria-label={t("close")} style={closeButton}>×</button>
        <div style={{ color: "#ff9a57", fontWeight: 900, fontSize: 13, letterSpacing: ".06em" }}>
          {t("trial_onboarding_eyebrow")}
        </div>
        <h2 id="trial-welcome-title" style={{ margin: "8px 32px 8px 0", fontSize: 28 }}>
          {t("trial_onboarding_title")}
        </h2>
        <p style={{ color: "#aeb7c9", lineHeight: 1.5, marginTop: 0 }}>
          {t("trial_onboarding_description")}
        </p>
        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button style={actionButton} onClick={() => go("products")}>
            <span>1</span><strong>{t("trial_onboarding_products")}</strong>
          </button>
          <button style={actionButton} onClick={() => go("cash")}>
            <span>2</span><strong>{t("trial_onboarding_cash")}</strong>
          </button>
          <button style={actionButton} onClick={() => go("pos")}>
            <span>3</span><strong>{t("trial_onboarding_sale")}</strong>
          </button>
        </div>
        <button type="button" onClick={dismiss} style={laterButton}>{t("trial_onboarding_later")}</button>
      </section>
    </div>
  );
}

const backdrop = {
  position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center",
  padding: 18, background: "rgba(3, 5, 9, .74)", backdropFilter: "blur(3px)",
};
const card = {
  position: "relative", width: "min(100%, 520px)", maxHeight: "calc(100dvh - 36px)",
  overflowY: "auto", boxSizing: "border-box", borderRadius: 16, padding: 26,
  background: "#181c25", color: "#f5f7fb", border: "1px solid #343c4e",
  boxShadow: "0 28px 90px rgba(0,0,0,.55)", fontFamily: "system-ui, -apple-system, sans-serif",
};
const closeButton = {
  position: "absolute", top: 12, right: 14, border: 0, background: "transparent",
  color: "#c9d0dd", fontSize: 28, lineHeight: 1, cursor: "pointer",
};
const actionButton = {
  display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, alignItems: "center",
  width: "100%", textAlign: "left", border: "1px solid #343c4e", borderRadius: 10,
  padding: 13, background: "#222836", color: "#f5f7fb", cursor: "pointer",
};
const laterButton = {
  width: "100%", marginTop: 14, border: 0, background: "transparent",
  color: "#aeb7c9", padding: 10, cursor: "pointer",
};
