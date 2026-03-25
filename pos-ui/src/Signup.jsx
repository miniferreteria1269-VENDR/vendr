import { useState } from "react";
import { useLang } from "./useLanguageContext";
import { COLORS, card, btnPrimary, btnSecondary, input } from "./uiStyles";

const API = "https://vendr-onkr.onrender.com";

export default function Signup({ onSignup, switchToLogin }) {

  const { t } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");

  const handleSignup = async () => {

    if (!email || !password || !storeName) {
      alert(t("please_fill_all_fields"));
      return;
    }

    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          store_name: storeName
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.removeItem("tickets");
        localStorage.removeItem("activeTicket");
        onSignup(data);
      } else {
        alert(data.detail || t("signup_failed"));
      }

    } catch (err) {
      console.error(err);
      alert(t("signup_error"));
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

        <h2 style={{ marginBottom: 16 }}>{t("create_account")}</h2>

        <label>{t("store_name")}</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 12 }}
          placeholder={t("store_name")}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />

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
          onClick={handleSignup}
        >
          {t("sign_up")}
        </button>

        <button
          style={{ ...btnSecondary, width: "100%" }}
          onClick={switchToLogin}
        >
          {t("back_to_login")}
        </button>

      </div>

    </div>
  );
}