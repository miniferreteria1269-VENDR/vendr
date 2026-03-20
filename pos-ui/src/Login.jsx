import { useState } from "react";

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
        // 🔥 CLEAR OLD SESSION DATA
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
    <div style={{ padding: 20 }}>

      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>
        Login
      </button>

      <br /><br />

      <button onClick={() => switchToSignup()}>
        Create Account
      </button>

    </div>
  );
}