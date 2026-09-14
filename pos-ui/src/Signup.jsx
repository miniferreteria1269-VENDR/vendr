import {
  useEffect,
  useRef,
  useState
} from "react";
import { useLang } from "./LanguageContext";
import LanguageToggle from "./LanguageToggle";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "./uiStyles";

const API = "https://vendr-onkr.onrender.com";

function SecurityCheck({
  siteKey,
  onToken
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    const renderWidget = () => {
      if (
        cancelled ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current !== null
      ) {
        return;
      }

      widgetIdRef.current =
        window.turnstile.render(
          containerRef.current,
          {
            sitekey: siteKey,
            callback: token =>
              onToken(token),
            "expired-callback": () =>
              onToken(""),
            "error-callback": () =>
              onToken("")
          }
        );
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector(
        'script[data-vendr-turnstile="true"]'
      );

      if (!script) {
        script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.vendrTurnstile = "true";
        document.head.appendChild(script);
      }

      script.addEventListener(
        "load",
        renderWidget
      );
    }

    return () => {
      cancelled = true;

      if (
        window.turnstile &&
        widgetIdRef.current !== null
      ) {
        try {
          window.turnstile.remove(
            widgetIdRef.current
          );
        } catch (error) {
          console.warn(
            "Unable to remove security widget:",
            error
          );
        }

        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} />;
}

export default function Signup({
  onSignup,
  switchToLogin
}) {
  const {
    t,
    lang
  } = useLang();

  const verificationToken =
    new URLSearchParams(
      window.location.search
    ).get("trial_token");

  const verificationStarted =
    useRef(false);

  const [
    config,
    setConfig
  ] = useState({
    loading: true,
    enabled: false,
    days: 14,
    turnstile_site_key: ""
  });

  const [
    contactName,
    setContactName
  ] = useState("");

  const [
    storeName,
    setStoreName
  ] = useState("");

  const [
    businessType,
    setBusinessType
  ] = useState("hardware_store");

  const [
    whatsapp,
    setWhatsapp
  ] = useState("");

  const [
    email,
    setEmail
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    securityToken,
    setSecurityToken
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    verificationState,
    setVerificationState
  ] = useState(
    verificationToken
      ? "verifying"
      : "form"
  );

  const [
    message,
    setMessage
  ] = useState("");

  useEffect(() => {
    if (verificationToken) {
      return;
    }

    let cancelled = false;

    fetch(`${API}/trial/config`)
      .then(response => response.json())
      .then(data => {
        if (!cancelled) {
          setConfig({
            loading: false,
            enabled: Boolean(data.enabled),
            days: Number(data.days || 14),
            turnstile_site_key:
              data.turnstile_site_key || ""
          });
        }
      })
      .catch(error => {
        console.error(
          "TRIAL CONFIG ERROR:",
          error
        );

        if (!cancelled) {
          setConfig(current => ({
            ...current,
            loading: false,
            enabled: false
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [verificationToken]);

  useEffect(() => {
    if (
      !verificationToken ||
      verificationStarted.current
    ) {
      return;
    }

    verificationStarted.current = true;

    const verify = async () => {
      try {
        const response = await fetch(
          `${API}/trial/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              token: verificationToken
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.detail ||
            t("trial_verification_failed")
          );
          setVerificationState("error");
          return;
        }

        localStorage.setItem(
          "vendr_access_token",
          data.access_token
        );
        localStorage.setItem(
          "user",
          JSON.stringify(data)
        );
        localStorage.removeItem("tickets");
        localStorage.removeItem(
          "activeTicket"
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        setVerificationState("complete");
        onSignup(data);

      } catch (error) {
        console.error(
          "TRIAL VERIFICATION ERROR:",
          error
        );
        setMessage(
          t("trial_verification_failed")
        );
        setVerificationState("error");
      }
    };

    verify();
  }, [
    verificationToken,
    onSignup,
    t
  ]);

  const handleSignup = async event => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (
      !contactName.trim() ||
      !storeName.trim() ||
      !businessType ||
      !whatsapp.trim() ||
      !email.trim() ||
      !password
    ) {
      alert(t("please_fill_all_fields"));
      return;
    }

    if (!securityToken) {
      alert(t("complete_security_check"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/trial/request`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            contact_name:
              contactName.trim(),
            store_name:
              storeName.trim(),
            business_type:
              businessType,
            whatsapp:
              whatsapp.trim(),
            email:
              email.trim(),
            password,
            language: lang,
            turnstile_token:
              securityToken
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
          t("signup_failed")
        );
        setSecurityToken("");
        return;
      }

      setVerificationState("sent");
      setMessage(
        t("trial_check_email")
      );

    } catch (error) {
      console.error(
        "TRIAL SIGNUP ERROR:",
        error
      );
      setMessage(t("signup_error"));

    } finally {
      setLoading(false);
    }
  };

  const shellStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background:
      COLORS.background ||
      COLORS.bg ||
      "#0f1115",
    boxSizing: "border-box"
  };

  if (verificationToken) {
    return (
      <div style={shellStyle}>
        <LanguageToggle style={signupLanguageToggle} />
        <div
          style={{
            ...card,
            width: "min(420px, 100%)",
            textAlign: "center"
          }}
        >
          <h2>
            {verificationState === "error"
              ? t("trial_verification_failed_title")
              : t("trial_verifying")}
          </h2>

          <p
            style={{
              color: COLORS.textDim,
              lineHeight: 1.5
            }}
          >
            {verificationState === "error"
              ? message
              : t("trial_verifying_description")}
          </p>

          {verificationState === "error" && (
            <button
              type="button"
              style={{
                ...btnSecondary,
                width: "100%"
              }}
              onClick={() => {
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
                switchToLogin();
              }}
            >
              {t("back_to_login")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (verificationState === "sent") {
    return (
      <div style={shellStyle}>
        <LanguageToggle style={signupLanguageToggle} />
        <div
          style={{
            ...card,
            width: "min(440px, 100%)"
          }}
        >
          <h2>{t("trial_email_sent")}</h2>

          <p
            style={{
              color: COLORS.textDim,
              lineHeight: 1.5
            }}
          >
            {message}
          </p>

          <p
            style={{
              color: COLORS.textDim,
              lineHeight: 1.5
            }}
          >
            {t("trial_link_expires")}
          </p>

          <button
            type="button"
            style={{
              ...btnSecondary,
              width: "100%"
            }}
            onClick={switchToLogin}
          >
            {t("back_to_login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
        <LanguageToggle style={signupLanguageToggle} />
      <form
        onSubmit={handleSignup}
        style={{
          ...card,
          width: "min(460px, 100%)"
        }}
      >
        <h2 style={{ marginBottom: 6 }}>
          {t("start_free_trial")}
        </h2>

        <p
          style={{
            color: COLORS.textDim,
            lineHeight: 1.45,
            marginTop: 0,
            marginBottom: 18
          }}
        >
          {t("trial_signup_description")}
        </p>

        <label>{t("owner_name")}</label>
        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
          value={contactName}
          onChange={event =>
            setContactName(
              event.target.value
            )
          }
          autoComplete="name"
          required
        />

        <label>{t("store_name")}</label>
        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
          value={storeName}
          onChange={event =>
            setStoreName(event.target.value)
          }
          required
        />

        <label>{t("business_type")}</label>
        <select
          style={{
            ...input,
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
          value={businessType}
          onChange={event =>
            setBusinessType(
              event.target.value
            )
          }
        >
          <option value="hardware_store">
            {t("business_hardware_store")}
          </option>
          <option value="retail_store">
            {t("business_retail_store")}
          </option>
          <option value="restaurant">
            {t("business_restaurant")}
          </option>
          <option value="distributor">
            {t("business_distributor")}
          </option>
          <option value="other">
            {t("other")}
          </option>
        </select>

        <label>{t("whatsapp")}</label>
        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
          type="tel"
          placeholder="+503 7000 0000"
          value={whatsapp}
          onChange={event =>
            setWhatsapp(event.target.value)
          }
          autoComplete="tel"
          required
        />

        <label>{t("email")}</label>
        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
          type="email"
          value={email}
          onChange={event =>
            setEmail(event.target.value)
          }
          autoComplete="email"
          required
        />

        <label>{t("password")}</label>
        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 14,
            boxSizing: "border-box"
          }}
          type="password"
          value={password}
          onChange={event =>
            setPassword(event.target.value)
          }
          autoComplete="new-password"
          minLength={8}
          required
        />

        <div
          style={{
            marginBottom: 14,
            minHeight: 65
          }}
        >
          {!config.loading &&
            config.enabled &&
            config.turnstile_site_key && (
              <SecurityCheck
                siteKey={
                  config.turnstile_site_key
                }
                onToken={setSecurityToken}
              />
            )}

          {!config.loading &&
            (!config.enabled ||
             !config.turnstile_site_key) && (
              <div
                style={{
                  color: COLORS.textDim,
                  padding: 10,
                  border:
                    `1px solid ${COLORS.border}`,
                  borderRadius: 8
                }}
              >
                {t("trial_not_available")}
              </div>
            )}
        </div>

        {message && (
          <div
            role="alert"
            style={{
              color: "#ffb454",
              marginBottom: 12,
              lineHeight: 1.4
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          style={{
            ...btnPrimary,
            width: "100%",
            marginBottom: 10,
            opacity:
              loading ||
              !config.enabled
                ? 0.65
                : 1
          }}
          disabled={
            loading ||
            config.loading ||
            !config.enabled ||
            !config.turnstile_site_key
          }
        >
          {loading
            ? t("loading")
            : t("start_trial_days")
                .replace(
                  "{days}",
                  String(config.days)
                )}
        </button>

        <button
          type="button"
          style={{
            ...btnSecondary,
            width: "100%"
          }}
          onClick={switchToLogin}
          disabled={loading}
        >
          {t("back_to_login")}
        </button>
      </form>
    </div>
  );
}


const signupLanguageToggle = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 20,
};
