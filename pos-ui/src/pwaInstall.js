let deferredInstallPrompt = null;
let initialized = false;
let installed = false;
const listeners = new Set();

function isStandalone() {
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone
  );
}

function isIos() {
  const userAgent = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent) || (
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1
  );
}

function emitState() {
  const state = getPwaInstallState();
  listeners.forEach(listener => listener(state));
}

export function getPwaInstallState() {
  return {
    installed: installed || isStandalone(),
    nativePromptAvailable: Boolean(deferredInstallPrompt),
    ios: isIos(),
  };
}

export function initializePwaInstall() {
  if (initialized) return;
  initialized = true;
  installed = isStandalone();

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emitState();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installed = true;
    emitState();
  });

  window.matchMedia?.("(display-mode: standalone)")
    .addEventListener?.("change", emitState);
}

export function subscribeToPwaInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function requestPwaInstall() {
  if (!deferredInstallPrompt) {
    return { outcome: "unavailable" };
  }

  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  emitState();
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice || { outcome: "dismissed" };
}
