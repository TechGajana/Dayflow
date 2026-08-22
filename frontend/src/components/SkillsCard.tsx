"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addSkill, deleteSkill } from "@/lib/api";

interface Skill {
  id: string;
  name: string;
  level: number | null;
}

interface SkillsCardProps {
  userId: string;
  skills: Skill[];
}

export default function SkillsCard({ userId, skills }: SkillsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState(3);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("dayflow_user");
    if (stored) {
      setViewer(JSON.parse(stored));
    }
  }, []);

  const handleAdd = async () => {
    if (!newSkill.trim()) return;
    await addSkill(userId, newSkill.trim(), newLevel);
    setNewSkill("");
    setNewLevel(3);
    setIsAdding(false);
    router.refresh();
  };

  const handleRemove = async (skillId: string) => {
    try {
      await deleteSkill(skillId);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete skill:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewSkill("");
    }
  };

  const getLevelColor = (level: number | null) => {
    if (!level) return "var(--border-primary)";
    const colors: Record<number, string> = {
      1: "#ef4444",
      2: "#f97316",
      3: "#eab308",
      4: "#22c55e",
      5: "#6366f1",
    };
    return colors[level] || "var(--border-primary)";
  };

  const isHr = viewer?.role === "HR";
  const isSelf = viewer?.id === userId;
  const canEdit = isHr || isSelf;

  return (
    <div className="glass-card animate-in animate-in-delay-2" id="skills-card">
      <div className="glass-card__header">
        <h2>Skills</h2>
        <span
          style={{
            fontSize: "var(--font-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          {skills.length} skills
        </span>
      </div>
      <div className="glass-card__body">
        {skills.length > 0 ? (
          <div className="skills-list">
            {skills.map((skill) => (
              <div
                className="skill-chip"
                key={skill.id}
                style={{
                  borderColor: `${getLevelColor(skill.level)}33`,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: getLevelColor(skill.level),
                    flexShrink: 0,
                  }}
                />
                {skill.name}
                {canEdit && (
                  <button
                    className="skill-chip__remove"
                    onClick={() => handleRemove(skill.id)}
                    aria-label={`Remove ${skill.name}`}
                    title={`Remove ${skill.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">🎯</div>
            <p className="empty-state__text">No skills added yet</p>
          </div>
        )}

        {canEdit && (
          <>
            {isAdding ? (
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  marginTop: "var(--space-3)",
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="Skill name..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  id="new-skill-input"
                  style={{ flex: 1 }}
                />
                <select
                  className="form-input"
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  style={{ width: "80px" }}
                  id="skill-level-select"
                >
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>
                      Lv.{l}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" onClick={handleAdd} id="save-skill-btn">
                  Add
                </button>
              </div>
            ) : (
              <button
                className="add-skill-btn"
                onClick={() => setIsAdding(true)}
                id="add-skill-btn"
              >
                <span>+</span> Add Skill
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
