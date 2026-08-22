"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateAboutSections } from "@/lib/api";
import EditModal from "./EditModal";

interface ContentSectionProps {
  userId: string;
  title: string;
  icon: string;
  content: string | null;
  fieldKey: "about" | "jobLove" | "hobbies";
  animationDelay?: number;
}

export default function ContentSection({
  userId,
  title,
  icon,
  content,
  fieldKey,
  animationDelay = 0,
}: ContentSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("dayflow_user");
    if (stored) {
      setViewer(JSON.parse(stored));
    }
  }, []);

  const handleSave = async (formData: Record<string, string>) => {
    await updateAboutSections(userId, { [fieldKey]: formData[fieldKey] });
    setIsEditing(false);
    router.refresh();
  };

  const isSelf = viewer?.id === userId;
  const canEdit = isSelf;

  return (
    <>
      <div
        className={`content-section animate-in`}
        style={{ animationDelay: `${animationDelay}s` }}
        id={`section-${fieldKey}`}
      >
        <div className="content-section__header">
          <h3 className="content-section__title">
            <span className="section-icon">{icon}</span>
            {title}
          </h3>
          {canEdit && (
            <button
              className="btn-edit"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit ${title}`}
              title={`Edit ${title}`}
              id={`edit-${fieldKey}-btn`}
            >
              ✎
            </button>
          )}
        </div>
        <div className="content-section__body">
          {content ? (
            <p>{content}</p>
          ) : (
            <p style={{ fontStyle: "italic", opacity: 0.5 }}>
              No information added yet. Click the edit button to add content.
            </p>
          )}
        </div>
      </div>

      {isEditing && (
        <EditModal
          title={`Edit ${title}`}
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          fields={[
            {
              key: fieldKey,
              label: title,
              value: content || "",
              type: "textarea",
            },
          ]}
        />
      )}
    </>
  );
}
