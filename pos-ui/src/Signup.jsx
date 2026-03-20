import { useState } from "react";

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
    <div style={{ padding: 20 }}>

      <h2>Create Account</h2>

      <input
        placeholder="Store Name"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
      />

      <br /><br />

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

      <button onClick={handleSignup}>
        Sign Up
      </button>

      <br /><br />

      <button onClick={switchToLogin}>
        Back to Login
      </button>

    </div>
  );
}