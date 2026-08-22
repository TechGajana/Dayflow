"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isRegistered = searchParams.get("registered");
    const emailParam = searchParams.get("email");
    const loggedOut = searchParams.get("loggedOut");

    if (isRegistered === "true") {
      setSuccessMessage("🎉 Registration complete! Please enter your details below to log in.");
      if (emailParam) {
        setLoginId(emailParam);
      }
    } else if (loggedOut === "true") {
      setSuccessMessage("🔒 You have been logged out successfully.");
    }
  }, [searchParams]);

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
      
      // Role-based post-login redirection
      if (user.role === "EMPLOYEE") {
        router.push(`/profile?id=${user.id}`);
      } else {
        router.push("/dashboard");
      }
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
          maxWidth: "420px",
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

        {successMessage && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "rgba(52, 211, 153, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
              color: "var(--success)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-sm)",
              marginBottom: "var(--space-4)"
            }}
            id="login-success"
          >
            {successMessage}
          </div>
        )}

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
              placeholder="e.g. EMP100 or email@domain.com"
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
                style={{ paddingRight: "var(--space-8)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "var(--space-3)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "var(--font-xs)"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "var(--space-2)" }}
            id="login-submit-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-primary)" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-sm)" }}>
            Don't have an account?{" "}
            <a
              onClick={() => router.push("/register")}
              style={{ color: "var(--text-accent)", cursor: "pointer", fontWeight: 600 }}
              id="goto-register-link"
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
