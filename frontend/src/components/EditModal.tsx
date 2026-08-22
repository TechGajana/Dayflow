"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface FieldConfig {
  key: string;
  label: string;
  value: string;
  type: "text" | "textarea" | "date";
}

interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  fields: FieldConfig[];
}

export default function EditModal({
  title,
  onClose,
  onSave,
  fields,
}: EditModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.value]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEsc);

    // Focus first input
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);

    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      data-closing={isClosing}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button
            className="modal__close"
            onClick={handleClose}
            aria-label="Close modal"
            id="modal-close-btn"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {fields.map((field, index) => (
              <div className="form-group" key={field.key}>
                <label className="form-label" htmlFor={`modal-${field.key}`}>
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={`modal-${field.key}`}
                    className="form-textarea"
                    value={formData[field.key] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    ref={
                      index === 0
                        ? (firstInputRef as React.Ref<HTMLTextAreaElement>)
                        : undefined
                    }
                  />
                ) : (
                  <input
                    id={`modal-${field.key}`}
                    className="form-input"
                    type={field.type}
                    value={formData[field.key] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    ref={
                      index === 0
                        ? (firstInputRef as React.Ref<HTMLInputElement>)
                        : undefined
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              id="modal-save-btn"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
