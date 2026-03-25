import { useState } from "react";
import { COLORS, card, btnPrimary, btnSecondary, input } from "./uiStyles";
import { useLang } from "./LanguageContext";

const API = "https://vendr-onkr.onrender.com";

export default function Login({ onLogin, switchToSignup }) {

  const { t, lang, changeLang } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem("tickets");
        localStorage.removeItem("activeTicket");

        localStorage.setItem("user", JSON.stringify(data));
        onLogin(data);
      } else {
        alert(data.detail || "Login failed");
      }

    } catch (err) {
      console.error(err);
      alert("Login error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: COLORS.background || "#0f1115"
    }}>

      <div style={{ ...card, width: 320 }}>

        {/* 🌐 LANGUAGE TOGGLE */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button
            style={btnSecondary}
            onClick={() => changeLang(lang === "en" ? "es" : "en")}
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
        </div>

        <h2 style={{ marginBottom: 16 }}>{t("login")}</h2>

        <label>{t("email")}</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 12 }}
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>{t("password")}</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 16 }}
          type="password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={{ ...btnPrimary, width: "100%", marginBottom: 10 }}
          onClick={handleLogin}
        >
          {t("login")}
        </button>

        <button
          style={{ ...btnSecondary, width: "100%" }}
          onClick={() => switchToSignup()}
        >
          {t("create_account")}
        </button>

      </div>

    </div>
  );
}