"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(loginId, password);
      localStorage.setItem("dayflow_user", JSON.stringify(user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "var(--bg-primary)"
      }}
    >
      <div
        className="glass-card animate-in"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "var(--space-8)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "var(--font-2xl)", fontWeight: 800, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Dayflow
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
            Sign in to manage your workday
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.2)",
              color: "var(--danger)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-sm)",
              marginBottom: "var(--space-4)"
            }}
            id="login-error"
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-id-input">
              Login ID / Email
            </label>
            <input
              id="login-id-input"
              type="text"
              className="form-input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. OIJODO20220001 or email@domain.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "14px"
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "var(--space-3)", marginTop: "var(--space-2)" }}
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? "Authenticating..." : "SIGN IN"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={{ fontWeight: 600 }}>
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
