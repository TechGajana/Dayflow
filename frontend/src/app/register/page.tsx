"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !name || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register({
        companyName,
        name,
        email,
        mobile,
        password,
      });
      router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
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
          maxWidth: "440px",
          padding: "var(--space-8)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "var(--font-2xl)", fontWeight: 800, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Dayflow
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
            Create your HRMS organization account
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
          {/* Company Name with Upload Logo */}
          <input
            type="file"
            ref={logoInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setLogoPreview(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="company-input">
              Company Name
            </label>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <input
                id="company-input"
                type="text"
                className="form-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Odoo India"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-ghost"
                title="Upload Company Logo"
                style={{
                  width: "42px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  overflow: "hidden",
                  border: logoPreview ? "1px solid var(--text-accent)" : "1px solid var(--border-primary)"
                }}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "📤"
                )}
              </button>
            </div>
            {logoPreview && (
              <span style={{ fontSize: "10px", color: "var(--text-accent)", marginTop: "2px" }}>
                ✓ Company logo uploaded
              </span>
            )}
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
            <label className="form-label" htmlFor="mobile-input">
              Phone Number
            </label>
            <input
              id="mobile-input"
              type="tel"
              className="form-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Password with Eye Toggle */}
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

          {/* Confirm Password with Eye Toggle */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password-input">
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? "text" : "password"}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "var(--space-3)", marginTop: "var(--space-2)" }}
            disabled={loading}
            id="register-submit-btn"
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ fontWeight: 600 }}>
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
