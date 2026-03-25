import { useState } from "react";
import { COLORS, card, btnPrimary, btnSecondary, input } from "./uiStyles";

const API = "https://vendr-onkr.onrender.com";

export default function Login({ onLogin, switchToSignup }) {

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

        <h2 style={{ marginBottom: 16 }}>Login</h2>

        <label>Email</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 12 }}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 16 }}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={{ ...btnPrimary, width: "100%", marginBottom: 10 }}
          onClick={handleLogin}
        >
          Login
        </button>

        <button
          style={{ ...btnSecondary, width: "100%" }}
          onClick={() => switchToSignup()}
        >
          Create Account
        </button>

      </div>

    </div>
  );
}