import { useState } from "react";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "./uiStyles";

import {
  useLang
} from "./LanguageContext";

const API =
  "https://vendr-onkr.onrender.com";

export default function Login({
  onLogin,
  switchToSignup
}) {
  const {
    t,
    lang,
    changeLang
  } = useLang();

  const [
    email,
    setEmail
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data =
        await response.json();

      if (response.ok) {
        localStorage.removeItem(
          "tickets"
        );

        localStorage.removeItem(
          "activeTicket"
        );

        if (data.access_token) {
          localStorage.setItem(
            "vendr_access_token",
            data.access_token
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(data)
        );

        onLogin(data);

        return;
      }

      alert(
        data.detail ||
        "Login failed"
      );

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      alert(
        "Login error"
      );

    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = event => {
    if (
      event.key === "Enter"
    ) {
      handleLogin();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          COLORS.background ||
          "#0f1115"
      }}
    >
      <div
        style={{
          ...card,
          width: 320
        }}
      >
        {/* LANGUAGE TOGGLE */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginBottom: 10
          }}
        >
          <button
            type="button"
            style={btnSecondary}
            onClick={() =>
              changeLang(
                lang === "en"
                  ? "es"
                  : "en"
              )
            }
          >
            {lang === "en"
              ? "ES"
              : "EN"}
          </button>
        </div>

        <h2
          style={{
            marginBottom: 16
          }}
        >
          {t("login")}
        </h2>

        <label>
          {t("email")}
        </label>

        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 12
          }}
          placeholder={
            t("email")
          }
          value={email}
          onChange={event =>
            setEmail(
              event.target.value
            )
          }
          onKeyDown={
            handleKeyDown
          }
          autoComplete="username"
        />

        <label>
          {t("password")}
        </label>

        <input
          style={{
            ...input,
            width: "100%",
            marginBottom: 16
          }}
          type="password"
          placeholder={
            t("password")
          }
          value={password}
          onChange={event =>
            setPassword(
              event.target.value
            )
          }
          onKeyDown={
            handleKeyDown
          }
          autoComplete=
            "current-password"
        />

        <button
          type="button"
          style={{
            ...btnPrimary,
            width: "100%",
            marginBottom: 10,
            opacity:
              loading
                ? 0.65
                : 1,
            cursor:
              loading
                ? "not-allowed"
                : "pointer"
          }}
          onClick={
            handleLogin
          }
          disabled={
            loading
          }
        >
          {loading
            ? t("loading") ||
              "Loading..."
            : t("login")}
        </button>

        <button
          type="button"
          style={{
            ...btnSecondary,
            width: "100%"
          }}
          onClick={
            switchToSignup
          }
          disabled={
            loading
          }
        >
          {t(
            "create_account"
          )}
        </button>
      </div>
    </div>
  );
}
