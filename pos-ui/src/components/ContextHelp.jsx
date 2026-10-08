/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { useLang } from "../LanguageContext";
import { getContextHelpContent } from "../contextHelpContent";
import {
  getHelpModeStorageKey,
  parseHelpModePreference
} from "../contextHelpPreferences";

const ContextHelpState = createContext(null);

export function ContextHelpProvider({ userId, children }) {
  const storageKey = getHelpModeStorageKey(userId);
  const [enabled, setEnabled] = useState(() =>
    parseHelpModePreference(localStorage.getItem(storageKey))
  );
  const [openId, setOpenId] = useState(null);

  const updateEnabled = nextValue => {
    const next = Boolean(nextValue);
    setEnabled(next);
    localStorage.setItem(storageKey, String(next));
    if (!next) setOpenId(null);
  };

  return (
    <ContextHelpState.Provider
      value={{ enabled, updateEnabled, openId, setOpenId }}
    >
      {children}
    </ContextHelpState.Provider>
  );
}

export function useContextHelpMode() {
  const value = useContext(ContextHelpState);
  if (!value) {
    throw new Error("Context help must be used inside ContextHelpProvider");
  }
  return value;
}

export function HelpModeToggle({ compact = false }) {
  const { enabled, updateEnabled } = useContextHelpMode();
  const { t } = useLang();

  return (
    <button
      type="button"
      className={`help-mode-toggle${compact ? " is-compact" : ""}${enabled ? " is-enabled" : ""}`}
      role="switch"
      aria-checked={enabled}
      aria-label={
        enabled
          ? t("context_help_disable")
          : t("context_help_enable")
      }
      title={
        enabled
          ? t("context_help_disable")
          : t("context_help_enable")
      }
      onClick={() => updateEnabled(!enabled)}
    >
      <span className="help-mode-toggle-icon" aria-hidden="true">?</span>
      {!compact && (
        <span>
          {t("context_help")}: {enabled ? t("on") : t("off")}
        </span>
      )}
    </button>
  );
}

export default function ContextHelp({ topic, className = "" }) {
  const { enabled, openId, setOpenId } = useContextHelpMode();
  const { lang, t } = useLang();
  const generatedId = useId().replace(/:/g, "");
  const instanceId = `context-help-${generatedId}`;
  const dialogId = `${instanceId}-dialog`;
  const buttonRef = useRef(null);
  const dialogRef = useRef(null);
  const [position, setPosition] = useState(null);
  const content = getContextHelpContent(topic, lang);
  const isOpen = openId === instanceId;

  const close = useCallback((restoreFocus = true) => {
    setOpenId(null);
    if (restoreFocus) {
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }, [setOpenId]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || window.innerWidth <= 720) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12
    );
    const popoverHeight = Math.min(
      dialogRef.current?.offsetHeight || 260,
      window.innerHeight - 24
    );
    const below = rect.bottom + 8;
    const top = below + popoverHeight <= window.innerHeight - 12
      ? below
      : Math.max(12, rect.top - popoverHeight - 8);

    setPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === "Escape") close();
    };

    const handlePointerDown = event => {
      if (window.innerWidth <= 720) return;
      if (
        !dialogRef.current?.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        close(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, isOpen]);

  if (!enabled || !content) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`context-help-trigger ${className}`.trim()}
        aria-label={`${t("context_help_open")}: ${content.title}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          if (!isOpen) updatePosition();
          setOpenId(isOpen ? null : instanceId);
        }}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen && createPortal(
        <div
          className="context-help-layer"
          role="presentation"
          onPointerDown={event => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            ref={dialogRef}
            id={dialogId}
            className="context-help-popover"
            role="dialog"
            aria-modal={window.innerWidth <= 720 ? "true" : undefined}
            aria-labelledby={`${dialogId}-title`}
            tabIndex={-1}
            style={position || undefined}
          >
            <div className="context-help-heading">
              <h3 id={`${dialogId}-title`}>{content.title}</h3>
              <button
                type="button"
                className="context-help-close"
                aria-label={t("close")}
                onClick={() => close()}
              >
                ×
              </button>
            </div>

            <div className="context-help-body">
              {content.body.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {content.example && (
                <p className="context-help-example">
                  <strong>{t("example")}:</strong> {content.example}
                </p>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
