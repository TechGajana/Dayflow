"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !name || !email || !password) {
      setError("All fields are required");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await register({
        employeeId,
        name,
        email,
        password,
        role
      });
      // Store user in localstorage and redirect to dashboard
      localStorage.setItem("dayflow_user", JSON.stringify(user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
            Create an HRMS employee account
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
            id="register-error"
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="empid-input">
              Employee ID
            </label>
            <input
              id="empid-input"
              type="text"
              className="form-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP102"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name-input">
              Full Name
            </label>
            <input
              id="name-input"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@dayflow.io"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role-select">
              Organization Role
            </label>
            <select
              id="role-select"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="EMPLOYEE">Regular Employee</option>
              <option value="HR">HR Officer / Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "var(--space-3)", marginTop: "var(--space-2)" }}
            disabled={loading}
            id="register-submit-btn"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ fontWeight: 600 }}>
            Sign In instead
          </a>
        </div>
      </div>
    </div>
  );
}
