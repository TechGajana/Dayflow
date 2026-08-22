"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchLeaves, applyLeave, approveLeave, rejectLeave, fetchProfile, LeaveRequest, User } from "@/lib/api";
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
  const [hrComment, setHrComment] = useState("");

  const loadLeaves = async () => {
    try {
      const storedUser = localStorage.getItem("dayflow_user");
      if (!storedUser) return;
      const sess = JSON.parse(storedUser);

      if (sess.role === "HR") {
        const leavesData = await fetchLeaves(); // Load all leave requests in system
        setLeaves(leavesData);
      } else {
        const targetId = userId || sess.id;
        const [leavesData, prof] = await Promise.all([
          fetchLeaves(targetId),
          fetchProfile(targetId)
        ]);
        setLeaves(leavesData);
        setProfileUser(prof);
      }
    } catch (err) {
      console.error("Failed to load leaves logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const sess = JSON.parse(storedUser);
    setCurrentUser(sess);

    loadLeaves();
  }, [router, userId]);

  const handleApplyLeave = async (formData: Record<string, string>) => {
    if (!currentUser) return;
    const targetId = userId || currentUser.id;
    try {
      await applyLeave({
        userId: targetId,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        remarks: formData.remarks || undefined,
      });

      setIsApplying(false);
      loadLeaves();
    } catch (err) {
      alert("Failed to submit leave request");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave(id, hrComment);
      setHrComment("");
      loadLeaves();
    } catch (err) {
      alert("Failed to approve leave");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLeave(id, hrComment);
      setHrComment("");
      loadLeaves();
    } catch (err) {
      alert("Failed to reject leave");
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

  const isHr = currentUser.role === "HR";
  const pendingLeaves = leaves.filter((l) => l.status === "PENDING");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* ========================================================
           HR / ADMIN APPROVALS QUEUE & LEAVES LEDGER
           ======================================================== */}
        {isHr ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            {/* Pending Approvals */}
            <div className="glass-card animate-in">
              <div className="glass-card__header">
                <h2>Pending Time-Off Request Approvals Queue</h2>
              </div>
              <div className="glass-card__body">
                {pendingLeaves.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                      <input
                        type="text"
                        placeholder="Add HR comment/remarks for this decision..."
                        className="form-input"
                        value={hrComment}
                        onChange={(e) => setHrComment(e.target.value)}
                        style={{ flex: 1 }}
                        id="hr-leave-decision-comment"
                      />
                    </div>
                    {pendingLeaves.map((request) => (
                      <div
                        key={request.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "var(--space-4)",
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border-primary)",
                          borderRadius: "var(--radius-md)"
                        }}
                        className="leave-queue-item"
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{request.user?.name} ({request.user?.employeeId})</div>
                          <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Leave Type: {request.leaveType} • {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}
                          </div>
                          {request.remarks && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginTop: "4px", fontStyle: "italic" }}>
                              &ldquo;{request.remarks}&rdquo;
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="btn-primary"
                            style={{ background: "var(--success)", boxShadow: "0 2px 8px rgba(52, 211, 153, 0.3)" }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="btn-primary"
                            style={{ background: "var(--danger)", boxShadow: "0 2px 8px rgba(248, 113, 113, 0.3)" }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">🎉</div>
                    <p className="empty-state__text">Approvals queue is clear! No pending leave requests.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Log */}
            <div className="glass-card animate-in animate-in-delay-1">
              <div className="glass-card__header">
                <h2>All Employee Leaves History</h2>
                <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                  {leaves.length} total entries
                </span>
              </div>
              <div className="glass-card__body" style={{ padding: 0 }}>
                {leaves.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Employee</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Type</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Dates</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>HR Comments</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map((l) => (
                          <tr key={l.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                            <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600 }}>{l.user?.name}</td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>{l.leaveType}</td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                              {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", fontStyle: "italic", fontSize: "var(--font-sm)", color: "var(--text-tertiary)" }}>
                              {l.comment || "—"}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)" }}>
                              <span className="status-badge" style={getStatusStyle(l.status)}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">No leaves logged in system.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             EMPLOYEE TIME-OFF PAGE
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            <header className="page-header animate-in" style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0 }}>My Time-Off Requests</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
                  Manage leaves for {profileUser?.name || "Employee"} ({profileUser?.employeeId || "—"})
                </p>
              </div>
              <button
                onClick={() => setIsApplying(true)}
                className="btn-primary"
                id="apply-leave-btn"
              >
                ➕ Apply for Leave
              </button>
            </header>

            <div className="glass-card animate-in animate-in-delay-1" id="leaves-history-card">
              <div className="glass-card__header">
                <h2>My History</h2>
                <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                  {leaves.length} applications
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
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>HR Comments</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map((leave) => (
                          <tr key={leave.id} style={{ borderBottom: "1px solid var(--border-primary)", transition: "background var(--transition-fast)" }} className="content-section">
                            <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 500 }}>
                              {leave.leaveType}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                              {new Date(leave.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                              {new Date(leave.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", fontStyle: "italic", fontSize: "var(--font-sm)", color: "var(--text-tertiary)" }}>
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
        )}
      </main>

      {/* Apply Leave Modal */}
      {isApplying && (
        <EditModal
          title="Apply for Leave"
          onClose={() => setIsApplying(false)}
          onSave={handleApplyLeave}
          fields={[
            { key: "leaveType", label: "Leave Type", value: "Sick Leave", type: "text" },
            { key: "startDate", label: "Start Date", value: new Date().toISOString().split("T")[0], type: "date" },
            { key: "endDate", label: "End Date", value: new Date().toISOString().split("T")[0], type: "date" },
            { key: "remarks", label: "Reason / Remarks", value: "", type: "text" }
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
        Loading logs...
      </div>
    }>
      <LeavesContent />
    </Suspense>
  );
}
