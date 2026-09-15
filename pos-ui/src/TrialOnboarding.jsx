import {
  useEffect,
  useMemo,
  useState
} from "react";
import apiClient from "./apiClient";
import { useLang } from "./LanguageContext";

const EMPTY_STATUS = {
  products: false,
  cash: false,
  sale: false
};

export default function TrialOnboarding({
  storeId,
  onNavigate,
  localCompletedSteps = {},
  onActiveStepChange
}) {
  const { t } = useLang();
  const collapsedKey =
    `vendr_trial_onboarding_v2_collapsed_${storeId}`;
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(collapsedKey) !== "1"
  );
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [activeStep, setActiveStep] = useState(null);
  const [loading, setLoading] = useState(true);

  const steps = useMemo(() => [
    {
      id: "products",
      view: "products",
      title: t("trial_onboarding_products"),
      instruction: t("trial_onboarding_products_instruction")
    },
    {
      id: "cash",
      view: "cash",
      title: t("trial_onboarding_cash"),
      instruction: t("trial_onboarding_cash_instruction")
    },
    {
      id: "sale",
      view: "pos",
      title: t("trial_onboarding_sale"),
      instruction: t("trial_onboarding_sale_instruction")
    }
  ], [t]);

  useEffect(() => {
    let cancelled = false;

    if (!storeId) {
      return undefined;
    }

    apiClient.get(
      "/trial/onboarding-status"
    ).then(response => {
      if (!cancelled) {
        setStatus(response.data);
      }
    }).catch(error => {
      console.warn(
        "TRIAL ONBOARDING STATUS ERROR:",
        error
      );
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const resolvedStatus = {
    ...status,
    ...localCompletedSteps
  };
  const effectiveActiveStep =
    activeStep && !resolvedStatus[activeStep]
      ? activeStep
      : null;

  useEffect(() => {
    onActiveStepChange?.(
      expanded ? null : effectiveActiveStep
    );
  }, [
    effectiveActiveStep,
    expanded,
    onActiveStepChange
  ]);

  const completedCount = steps.filter(
    step => resolvedStatus[step.id]
  ).length;
  const complete = completedCount === steps.length;
  const currentStep = steps.find(
    step => step.id === effectiveActiveStep
  ) || steps.find(
    step => !resolvedStatus[step.id]
  ) || steps[0];

  const collapse = () => {
    localStorage.setItem(collapsedKey, "1");
    setExpanded(false);
  };

  const reopen = () => {
    localStorage.removeItem(collapsedKey);
    setExpanded(true);
  };

  const go = step => {
    setActiveStep(step.id);
    onNavigate(step.view);
    collapse();
  };

  if (!expanded) {
    if (complete) {
      return (
        <button
          type="button"
          onClick={reopen}
          style={completePill}
        >
          ✓ {t("trial_onboarding_complete_short")}
        </button>
      );
    }

    return (
      <aside
        aria-label={t("trial_onboarding_progress")}
        style={compactCard}
      >
        <div style={compactHeader}>
          <strong>
            {t("trial_onboarding_progress")
              .replace("{done}", completedCount)
              .replace("{total}", steps.length)}
          </strong>
          <button
            type="button"
            onClick={reopen}
            style={smallButton}
          >
            {t("trial_onboarding_continue")}
          </button>
        </div>

        {currentStep && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 800 }}>
              {currentStep.title}
            </div>
            <div style={instructionText}>
              {currentStep.instruction}
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-welcome-title"
      style={backdrop}
    >
      <section style={card}>
        <button
          type="button"
          onClick={collapse}
          aria-label={t("close")}
          style={closeButton}
        >
          ×
        </button>
        <div style={eyebrow}>
          {t("trial_onboarding_eyebrow")}
        </div>
        <h2 id="trial-welcome-title" style={title}>
          {complete
            ? t("trial_onboarding_complete")
            : t("trial_onboarding_title")}
        </h2>
        <p style={description}>
          {complete
            ? t("trial_onboarding_complete_description")
            : t("trial_onboarding_description")}
        </p>

        <div style={progressTrack}>
          <div
            style={{
              ...progressFill,
              width: `${(completedCount / steps.length) * 100}%`
            }}
          />
        </div>
        <div style={progressLabel}>
          {loading
            ? t("loading")
            : t("trial_onboarding_progress")
                .replace("{done}", completedCount)
                .replace("{total}", steps.length)}
        </div>

        <div style={stepList}>
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => go(step)}
              style={{
                ...actionButton,
                borderColor: resolvedStatus[step.id]
                  ? "#2f9e69"
                  : "#3b82f6"
              }}
            >
              <span style={{
                ...stepNumber,
                background: resolvedStatus[step.id]
                  ? "#2f9e69"
                  : "#2b3445"
              }}>
                {resolvedStatus[step.id] ? "✓" : index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <small style={stepInstruction}>
                  {step.instruction}
                </small>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={collapse}
          style={laterButton}
        >
          {complete
            ? t("close")
            : t("trial_onboarding_later")}
        </button>
      </section>
    </div>
  );
}

const backdrop = {
  position: "fixed", inset: 0, zIndex: 10000, display: "grid",
  placeItems: "center", padding: 18, background: "rgba(3, 5, 9, .74)",
  backdropFilter: "blur(3px)"
};
const card = {
  position: "relative", width: "min(100%, 560px)",
  maxHeight: "calc(100dvh - 36px)", overflowY: "auto",
  boxSizing: "border-box", borderRadius: 16, padding: 26,
  background: "#181c25", color: "#f5f7fb",
  border: "1px solid #343c4e", boxShadow: "0 28px 90px rgba(0,0,0,.55)",
  fontFamily: "system-ui, -apple-system, sans-serif"
};
const compactCard = {
  position: "fixed", right: 16, bottom: 16, zIndex: 9000,
  width: "min(380px, calc(100vw - 32px))", boxSizing: "border-box",
  padding: 14, borderRadius: 12, color: "#f5f7fb",
  background: "#181c25", border: "1px solid #3b82f6",
  boxShadow: "0 14px 36px rgba(0,0,0,.45)",
  fontFamily: "system-ui, -apple-system, sans-serif"
};
const completePill = {
  position: "fixed", right: 16, bottom: 16, zIndex: 9000,
  border: "1px solid #2f9e69", borderRadius: 999,
  padding: "9px 13px", background: "#18251f", color: "#b9f6d2",
  boxShadow: "0 10px 28px rgba(0,0,0,.35)", fontWeight: 800,
  cursor: "pointer", fontFamily: "system-ui, -apple-system, sans-serif"
};
const compactHeader = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12
};
const smallButton = {
  border: 0, borderRadius: 7, padding: "7px 10px",
  background: "#3aa0ff", color: "#07111d", fontWeight: 800,
  cursor: "pointer", whiteSpace: "nowrap"
};
const closeButton = {
  position: "absolute", top: 12, right: 14, border: 0,
  background: "transparent", color: "#c9d0dd", fontSize: 28,
  lineHeight: 1, cursor: "pointer"
};
const eyebrow = {
  color: "#ff9a57", fontWeight: 900, fontSize: 13,
  letterSpacing: ".06em"
};
const title = { margin: "8px 32px 8px 0", fontSize: 28 };
const description = {
  color: "#aeb7c9", lineHeight: 1.5, marginTop: 0
};
const progressTrack = {
  height: 7, overflow: "hidden", borderRadius: 999,
  background: "#2b3140", marginTop: 18
};
const progressFill = {
  height: "100%", borderRadius: 999, background: "#3aa0ff",
  transition: "width .2s ease"
};
const progressLabel = {
  color: "#aeb7c9", fontSize: 12, marginTop: 6, textAlign: "right"
};
const stepList = { display: "grid", gap: 10, marginTop: 14 };
const actionButton = {
  display: "grid", gridTemplateColumns: "34px 1fr", gap: 12,
  alignItems: "center", width: "100%", textAlign: "left",
  border: "1px solid", borderRadius: 10, padding: 13,
  background: "#222836", color: "#f5f7fb", cursor: "pointer"
};
const stepNumber = {
  width: 28, height: 28, borderRadius: "50%", display: "grid",
  placeItems: "center", fontWeight: 900
};
const stepInstruction = {
  display: "block", marginTop: 4, color: "#aeb7c9",
  fontWeight: 500, lineHeight: 1.35
};
const instructionText = {
  marginTop: 4, color: "#aeb7c9", fontSize: 13, lineHeight: 1.4
};
const laterButton = {
  width: "100%", marginTop: 14, border: 0, background: "transparent",
  color: "#aeb7c9", padding: 10, cursor: "pointer"
};
