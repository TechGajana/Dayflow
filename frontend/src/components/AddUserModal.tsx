"use client";

import React, { useState, useRef } from "react";
import { createEmployee } from "@/lib/api";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: (info: { loginId: string; temporaryPassword?: string; name: string }) => void;
  currentUserId: string;
  defaultCompany?: string;
  isAdmin: boolean;
}

export default function AddUserModal({
  onClose,
  onSuccess,
  currentUserId,
  defaultCompany = "Dayflow Technologies",
  isAdmin
}: AddUserModalProps) {
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !name.trim() || !email.trim()) {
      setError("Company Name, Full Name, and Email Address are required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await createEmployee({
        hrUserId: currentUserId,
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        role: "EMPLOYEE"
      });

      onSuccess({
        loginId: result.employee.employeeId,
        temporaryPassword: password,
        name: result.employee.name
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to register new user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal animate-in"
        style={{
          maxWidth: "460px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-glass)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top-right */}
        <button
          className="modal__close"
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}
        >
          ×
        </button>

        {/* Modal Form Body - Matches Image 1 Exactly */}
        <div style={{ padding: "var(--space-6)" }}>
          {error && (
            <div
              style={{
                padding: "var(--space-3)",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                color: "#fca5a5",
                fontSize: "var(--font-sm)",
                marginBottom: "var(--space-4)"
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            
            {/* COMPANY NAME */}
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
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                COMPANY NAME
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input
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

            {/* FULL NAME */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                FULL NAME
              </label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            {/* EMAIL ADDRESS */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@dayflow.io"
                required
              />
            </div>

            {/* PHONE NUMBER */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                PHONE NUMBER
              </label>
              <input
                type="tel"
                className="form-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
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

            {/* CONFIRM PASSWORD */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                CONFIRM PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
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

            {/* SIGN UP BUTTON - Full width exactly like Image 1 */}
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-6)",
                marginTop: "var(--space-2)",
                fontSize: "var(--font-md)",
                fontWeight: 600,
                borderRadius: "var(--radius-md)"
              }}
              disabled={loading}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
