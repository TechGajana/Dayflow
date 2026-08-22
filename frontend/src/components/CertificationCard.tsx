"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addCertification, deleteCertification, Certification } from "@/lib/api";
import EditModal from "./EditModal";

interface CertificationCardProps {
  userId: string;
  certifications: Certification[];
}

export default function CertificationCard({
  userId,
  certifications,
}: CertificationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("dayflow_user");
    if (stored) {
      setViewer(JSON.parse(stored));
    }
  }, []);

  const handleAdd = async (formData: Record<string, string>) => {
    await addCertification(userId, {
      name: formData.name,
      issuer: formData.issuer,
      issueDate: formData.issueDate || undefined,
      expiryDate: formData.expiryDate || undefined,
    });
    setIsAdding(false);
    router.refresh();
  };

  const handleRemove = async (certId: string) => {
    await deleteCertification(certId);
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

  const isSelf = viewer?.id === userId;
  const canEdit = isSelf;

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
                      <div className="cert-issuer">{cert.issuer}</div>
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

      {isAdding && (
        <EditModal
          title="Add Certification"
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          fields={[
            { key: "name", label: "Certification Name", value: "", type: "text" },
            { key: "issuer", label: "Issuing Organization", value: "", type: "text" },
            { key: "issueDate", label: "Issue Date", value: "", type: "date" },
            { key: "expiryDate", label: "Expiry Date", value: "", type: "date" },
          ]}
        />
      )}
    </>
  );
}
