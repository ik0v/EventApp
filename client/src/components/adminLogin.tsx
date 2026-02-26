import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import "./adminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { reload } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }
      // success → reload or redirect
      await reload();
      navigate("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-login">
      <input
        type="email"
        placeholder="Admin email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <div className="admin-login-error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login as Admin"}
      </button>
    </form>
  );
}
