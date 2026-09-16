import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";
import { LanguageProvider } from "./LanguageContext";
import { initializePwaInstall } from "./pwaInstall";
import InstallAppButton from "./components/InstallAppButton";

initializePwaInstall();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <App />
      <InstallAppButton compact floating />
    </LanguageProvider>
  </StrictMode>
);
