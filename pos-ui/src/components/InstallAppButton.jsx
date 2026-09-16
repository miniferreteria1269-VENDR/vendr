import { useEffect, useState } from "react";
import { useLang } from "../LanguageContext";
import {
  getPwaInstallState,
  requestPwaInstall,
  subscribeToPwaInstall,
} from "../pwaInstall";

export default function InstallAppButton({ compact = false, floating = false, style = {} }) {
  const { lang } = useLang();
  const copy = COPY[lang] || COPY.en;
  const [installState, setInstallState] = useState(getPwaInstallState);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(
    () => subscribeToPwaInstall(setInstallState),
    []
  );

  useEffect(() => {
    if (!showInstructions) return undefined;

    const closeOnEscape = event => {
      if (event.key === "Escape") setShowInstructions(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showInstructions]);

  if (installState.installed) return null;

  const handleInstall = async () => {
    if (installState.nativePromptAvailable) {
      try {
        await requestPwaInstall();
      } catch (error) {
        console.warn("Unable to open the PWA install prompt:", error);
        setShowInstructions(true);
      }
      return;
    }

    setShowInstructions(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        style={{
          ...buttonStyle,
          ...(compact ? compactButtonStyle : {}),
          ...(floating ? floatingButtonStyle : {}),
          ...style,
        }}
      >
        <span aria-hidden="true">⇩</span>
        {compact ? copy.short : copy.install}
      </button>

      {showInstructions && (
        <div
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowInstructions(false);
          }}
          style={overlayStyle}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="install-vendr-title" style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>{copy.eyebrow}</div>
                <h2 id="install-vendr-title" style={{ margin: "5px 0 0" }}>
                  {copy.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setShowInstructions(false)}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <p style={introStyle}>{copy.intro}</p>
            <ol style={stepsStyle}>
              {(installState.ios
                ? copy.iosSteps
                : copy.browserSteps
              ).map(step => <li key={step}>{step}</li>)}
            </ol>
            <p style={hintStyle}>{copy.hint}</p>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              style={{ ...buttonStyle, width: "100%", justifyContent: "center" }}
            >
              {copy.understood}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #3ba4f7",
  borderRadius: 10,
  background: "rgba(59, 164, 247, .12)",
  color: "#dbeeff",
  padding: "12px 16px",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const compactButtonStyle = {
  border: "none",
  borderRadius: 6,
  background: "#202532",
  color: "#f5f7fb",
  padding: "6px 10px",
  fontSize: 13,
};

const floatingButtonStyle = {
  position: "fixed",
  right: 14,
  bottom: 14,
  zIndex: 900,
  boxShadow: "0 10px 30px rgba(0, 0, 0, .38)",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(0, 0, 0, .78)",
};

const modalStyle = {
  width: "min(100%, 460px)",
  boxSizing: "border-box",
  border: "1px solid #3a4255",
  borderRadius: 16,
  background: "#171a22",
  color: "#f5f7fb",
  padding: 22,
  boxShadow: "0 28px 80px rgba(0, 0, 0, .55)",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const eyebrowStyle = {
  color: "#ff8a3d",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: ".06em",
};

const closeButtonStyle = {
  border: 0,
  background: "transparent",
  color: "#cbd5e1",
  fontSize: 28,
  lineHeight: 1,
  cursor: "pointer",
};

const introStyle = { color: "#b9c2d3", lineHeight: 1.55 };
const stepsStyle = { display: "grid", gap: 12, paddingLeft: 23, lineHeight: 1.5 };
const hintStyle = { color: "#8f9aae", fontSize: 13, lineHeight: 1.45, margin: "20px 0" };

const COPY = {
  en: {
    install: "Install VENDR",
    short: "Install",
    eyebrow: "QUICK ACCESS",
    title: "Install VENDR as an app",
    intro: "Keep VENDR on your home screen and open it without searching for the website.",
    iosSteps: [
      "Open VENDR in Safari.",
      "Tap the Share button in the browser toolbar.",
      "Choose “Add to Home Screen,” then confirm Add.",
    ],
    browserSteps: [
      "Open your browser menu (usually the three dots).",
      "Choose “Install app” or “Add to Home screen.”",
      "Confirm the installation when your browser asks.",
    ],
    hint: "The wording may vary slightly depending on your browser. If VENDR is already installed, open it from your home screen.",
    understood: "Got it",
    close: "Close",
  },
  es: {
    install: "Instalar VENDR",
    short: "Instalar",
    eyebrow: "ACCESO RÁPIDO",
    title: "Instala VENDR como aplicación",
    intro: "Mantén VENDR en tu pantalla de inicio y ábrelo sin tener que buscar el sitio web.",
    iosSteps: [
      "Abre VENDR en Safari.",
      "Toca el botón Compartir en la barra del navegador.",
      "Elige “Agregar a pantalla de inicio” y confirma Agregar.",
    ],
    browserSteps: [
      "Abre el menú del navegador (normalmente los tres puntos).",
      "Elige “Instalar aplicación” o “Agregar a pantalla de inicio”.",
      "Confirma la instalación cuando el navegador lo solicite.",
    ],
    hint: "Las palabras pueden variar un poco según el navegador. Si VENDR ya está instalado, ábrelo desde tu pantalla de inicio.",
    understood: "Entendido",
    close: "Cerrar",
  },
};
