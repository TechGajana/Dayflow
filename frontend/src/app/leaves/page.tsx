"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchLeaves, applyLeave, fetchProfile, LeaveRequest, User } from "@/lib/api";
import EditModal from "@/components/EditModal";

function LeavesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const sess = JSON.parse(storedUser);
    setCurrentUser(sess);

    const targetId = userId || sess.id;

    const loadLeaves = async () => {
      try {
        const [leavesData, prof] = await Promise.all([
          fetchLeaves(targetId),
          fetchProfile(targetId)
        ]);
        setLeaves(leavesData);
        setProfileUser(prof);
      } catch (err) {
        console.error("Failed to load leaves logs:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaves();
  }, [router, userId]);

  const handleApply = async (formData: Record<string, string>) => {
    const targetId = userId || currentUser?.id;
    if (!targetId) return;

    try {
      await applyLeave({
        userId: targetId,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        remarks: formData.remarks
      });

      setIsApplying(false);
      // Reload history
      const lvs = await fetchLeaves(targetId);
      setLeaves(lvs);
    } catch (err) {
      alert("Failed to submit leave request");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { background: "rgba(52, 211, 153, 0.1)", color: "var(--success)", borderColor: "rgba(52, 211, 153, 0.2)" };
      case "REJECTED":
        return { background: "rgba(248, 113, 113, 0.1)", color: "var(--danger)", borderColor: "rgba(248, 113, 113, 0.2)" };
      default:
        return { background: "rgba(250, 204, 21, 0.1)", color: "var(--warning)", borderColor: "rgba(250, 204, 21, 0.2)" };
    }
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading logs...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
      <Sidebar />

      <div style={{ flex: 1 }}>
        <header className="page-header animate-in" style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between" }}>
          <div>
            <h1>Leaves & Time-Off</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
              Leave records for {profileUser?.name || "Employee"} ({profileUser?.employeeId || "—"})
            </p>
          </div>
          <button
            onClick={() => setIsApplying(true)}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            id="apply-leave-btn"
          >
            ➕ Apply for Leave
          </button>
        </header>

        <div className="glass-card animate-in animate-in-delay-1" id="leaves-history-card">
          <div className="glass-card__header">
            <h2>Applications Log</h2>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
              {leaves.length} requests
            </span>
          </div>

          <div className="glass-card__body" style={{ padding: 0 }}>
            {leaves.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Type</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Start Date</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>End Date</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Remarks</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>HR Comments</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id} style={{ borderBottom: "1px solid var(--border-primary)", transition: "background var(--transition-fast)" }} className="content-section">
                        <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600 }}>
                          {leave.leaveType}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                          {new Date(leave.startDate).toLocaleDateString([], { timeZone: "UTC" })}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                          {new Date(leave.endDate).toLocaleDateString([], { timeZone: "UTC" })}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-tertiary)", fontSize: "var(--font-sm)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={leave.remarks || ""}>
                          {leave.remarks || "—"}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)", fontSize: "var(--font-sm)", fontStyle: "italic", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={leave.comment || ""}>
                          {leave.comment || "—"}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)" }}>
                          <span className="status-badge" style={getStatusStyle(leave.status)}>
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon">📅</div>
                <p className="empty-state__text">No leave requests submitted yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isApplying && (
        <EditModal
          title="Submit Leave Application"
          onClose={() => setIsApplying(false)}
          onSave={handleApply}
          fields={[
            {
              key: "leaveType",
              label: "Leave Type (PAID, SICK, UNPAID)",
              value: "PAID",
              type: "text"
            },
            {
              key: "startDate",
              label: "Start Date",
              value: "",
              type: "date"
            },
            {
              key: "endDate",
              label: "End Date",
              value: "",
              type: "date"
            },
            {
              key: "remarks",
              label: "Remarks",
              value: "",
              type: "textarea"
            }
          ]}
        />
      )}
    </div>
  );
}

export default function LeavesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading leaves registry...
      </div>
    }>
      <LeavesContent />
    </Suspense>
  );
}
