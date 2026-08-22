"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addCertification, deleteCertification, Certification } from "@/lib/api";

interface CertificationCardProps {
  userId: string;
  certifications: Certification[];
  onUpdate?: () => void;
}

export default function CertificationCard({
  userId,
  certifications,
  onUpdate,
}: CertificationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(null);
  const router = useRouter();

  // Add Certification Form State
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dayflow_user");
    if (stored) {
      setViewer(JSON.parse(stored));
    }
  }, []);

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      let issuerValue = issuer.trim();
      if (certFile) {
        issuerValue = `${issuerValue ? issuerValue + " " : ""}(Attached: ${certFile.name})`;
      }

      await addCertification(userId, {
        name: name.trim(),
        issuer: issuerValue || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
      });

      // Reset form
      setName("");
      setIssuer("");
      setIssueDate("");
      setExpiryDate("");
      setCertFile(null);
      setIsAdding(false);
      onUpdate?.();
      router.refresh();
    } catch (err) {
      console.error("Failed to add certification:", err);
      alert("Failed to add certification");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (certId: string) => {
    await deleteCertification(certId);
    onUpdate?.();
    router.refresh();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    });
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const isHr = viewer?.role === "HR" || viewer?.role === "ADMIN";
  const isSelf = viewer?.id === userId;
  const canEdit = isSelf || isHr;

  return (
    <>
      <div
        className="glass-card animate-in animate-in-delay-3"
        id="certification-card"
      >
        <div className="glass-card__header">
          <h2>Certifications</h2>
          <span
            style={{
              fontSize: "var(--font-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            {certifications.length}
          </span>
        </div>
        <div className="glass-card__body">
          {certifications.length > 0 ? (
            <div className="cert-list">
              {certifications.map((cert) => (
                <div className="cert-item" key={cert.id}>
                  <div className="cert-icon">📜</div>
                  <div className="cert-info">
                    <div className="cert-name">{cert.name}</div>
                    {cert.issuer && (
                      <div className="cert-issuer" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{cert.issuer}</span>
                      </div>
                    )}
                    <div className="cert-date">
                      {formatDate(cert.issueDate)}
                      {cert.expiryDate && (
                        <>
                          {" → "}
                          <span
                            style={{
                              color: isExpired(cert.expiryDate)
                                ? "var(--danger)"
                                : "inherit",
                            }}
                          >
                            {formatDate(cert.expiryDate)}
                            {isExpired(cert.expiryDate) && " (Expired)"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      className="btn-edit"
                      onClick={() => handleRemove(cert.id)}
                      aria-label={`Remove ${cert.name}`}
                      title={`Remove ${cert.name}`}
                      style={{ flexShrink: 0 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">🏆</div>
              <p className="empty-state__text">No certifications added yet</p>
            </div>
          )}

          {canEdit && (
            <button
              className="add-cert-btn"
              onClick={() => setIsAdding(true)}
              id="add-cert-btn"
            >
              <span>+</span> Add Certification
            </button>
          )}
        </div>
      </div>

      {/* Add Certification Modal matching Screenshot 2 */}
      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div
            className="modal animate-in"
            style={{
              maxWidth: "480px",
              width: "95%",
              background: "var(--bg-glass)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              padding: "var(--space-6)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header" style={{ padding: 0, marginBottom: "var(--space-5)" }}>
              <h2 className="modal__title" style={{ fontSize: "var(--font-xl)", margin: 0 }}>
                Add Certification
              </h2>
              <button className="modal__close" onClick={() => setIsAdding(false)}>×</button>
            </div>

            <form onSubmit={handleAddCert} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                  CERTIFICATION NAME
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                  ISSUING ORGANIZATION
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="e.g. Amazon Web Services"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                  ISSUE DATE
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                  EXPIRY DATE
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              {/* UPLOAD CERTIFICATE FILE */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-accent)" }}>
                  UPLOAD CERTIFICATE FILE / DOCUMENT
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setCertFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "var(--space-3)",
                    border: "1px dashed var(--text-accent)",
                    background: "rgba(168, 85, 247, 0.05)",
                    color: "var(--text-accent)"
                  }}
                >
                  📁 {certFile ? `Selected: ${certFile.name}` : "Choose Certificate File (.pdf, image)"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
                <button type="button" className="btn-ghost" onClick={() => setIsAdding(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
