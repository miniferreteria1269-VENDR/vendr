import { useState } from "react";
import { COLORS, card, btnPrimary, btnSecondary, input } from "./uiStyles";

const API = "https://vendr-onkr.onrender.com";

export default function Signup({ onSignup, switchToLogin }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");

  const handleSignup = async () => {

    if (!email || !password || !storeName) {
      alert("Please fill all fields");
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
        alert(data.detail || "Signup failed");
      }

    } catch (err) {
      console.error(err);
      alert("Signup error");
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

        <h2 style={{ marginBottom: 16 }}>Create Account</h2>

        <label>Store Name</label>
        <input
          style={{ ...input, width: "100%", marginBottom: 12 }}
          placeholder="Store Name"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />

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
          onClick={handleSignup}
        >
          Sign Up
        </button>

        <button
          style={{ ...btnSecondary, width: "100%" }}
          onClick={switchToLogin}
        >
          Back to Login
        </button>

      </div>

    </div>
  );
}