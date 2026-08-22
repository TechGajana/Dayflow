"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/api";
import EditModal from "./EditModal";

interface ProfileHeaderProps {
  user: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    role: string;
    mobile: string | null;
    avatarUrl: string | null;
    company: string | null;
    department: string | null;
    manager: string | null;
    location: string | null;
    title: string | null;
    address: string | null;
  };
  onUpdate?: () => void;
}

export default function ProfileHeader({ user, onUpdate }: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("dayflow_user");
    if (stored) {
      setViewer(JSON.parse(stored));
    }
  }, []);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async (formData: Record<string, string>) => {
    await updateProfile(user.id, formData);
    setIsEditing(false);
    onUpdate?.();
    router.refresh();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      try {
        await updateProfile(user.id, { avatarUrl: base64Url });

        if (viewer?.id === user.id) {
          const stored = localStorage.getItem("dayflow_user");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.avatarUrl = base64Url;
            localStorage.setItem("dayflow_user", JSON.stringify(parsed));
          }
        }

        onUpdate?.();
        router.refresh();
      } catch (err) {
        console.error("Failed to upload profile photo:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const isHr = viewer?.role === "HR" || viewer?.role === "ADMIN";
  const isSelf = viewer?.id === user.id;
  const canEdit = isSelf || isHr;

  const fields = [
    { label: "Email", key: "email", value: user.email, adminOnly: false },
    { label: "Mobile", key: "mobile", value: user.mobile, adminOnly: false },
    { label: "Role (EMPLOYEE / HR)", key: "role", value: user.role, adminOnly: true },
    { label: "Company", key: "company", value: user.company, adminOnly: true },
    { label: "Department", key: "department", value: user.department, adminOnly: true },
    { label: "Manager", key: "manager", value: user.manager, adminOnly: true },
    { label: "Location", key: "location", value: user.location, adminOnly: true },
    { label: "Job Title", key: "title", value: user.title, adminOnly: true },
    { label: "Address", key: "address", value: user.address, adminOnly: false },
  ];

  // Filter which fields are shown based on permissions
  const visibleFields = fields.filter((f) => !f.adminOnly || isHr || isSelf);

  // Filter which fields are editable during form popups
  const editableFields = fields
    .map((f) => ({
      key: f.key,
      label: f.label,
      value: f.value || "",
      type: "text" as const,
    }));

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoUpload}
      />

      <div className="profile-header">
        <div className="profile-avatar-section">
          <div
            className="profile-avatar"
            id="profile-avatar"
            style={{ cursor: canEdit ? "pointer" : "default" }}
            onClick={() => canEdit && fileInputRef.current?.click()}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              initials
            )}
            {canEdit && (
              <button
                type="button"
                className="profile-avatar__edit"
                aria-label="Edit avatar"
                title="Change profile photo"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                ✎
              </button>
            )}
          </div>
        </div>

        <div className="profile-info">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 className="profile-name" id="profile-name">
              {user.name}
            </h2>
            {canEdit && (
              <button
                className="btn-edit"
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
                title="Edit profile information"
                id="edit-profile-btn"
              >
                ✎
              </button>
            )}
          </div>
          {user.title && (
            <span className="profile-role">
              {user.title} {user.department ? `• ${user.department}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="profile-fields">
        {visibleFields.map((field) => (
          <div className="field-group" key={field.key}>
            <span className="field-label">{field.label}</span>
            <span className="field-value" id={`field-${field.key}`}>
              {field.value || "—"}
            </span>
          </div>
        ))}
      </div>

      {isEditing && (
        <EditModal
          title="Edit Profile Details"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          fields={editableFields}
        />
      )}
    </>
  );
}
