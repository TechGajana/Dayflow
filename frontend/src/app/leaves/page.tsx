"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchLeaves, applyLeave, approveLeave, rejectLeave, fetchProfile, LeaveRequest, User } from "@/lib/api";

// 12-Month Leave Calendar Grid Component
function CalendarYearGrid({ leaves }: { leaves: LeaveRequest[] }) {
  const year = new Date().getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Helper to determine status for a specific date
  const getDateStatus = (date: Date) => {
    // Clear hours to compare date portion only
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    for (const leave of leaves) {
      const start = new Date(leave.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.endDate);
      end.setHours(23, 59, 59, 999);

      if (compareDate >= start && compareDate <= end) {
        return leave.status;
      }
    }
    return null;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-6)" }}>
      {months.map((m, monthIdx) => {
        const totalDays = new Date(year, monthIdx + 1, 0).getDate();
        const startOffset = new Date(year, monthIdx, 1).getDay();
        const daysArray = [];

        // Padding cells for grid offset
        for (let i = 0; i < startOffset; i++) {
          daysArray.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
          daysArray.push(new Date(year, monthIdx, i));
        }

        return (
          <div key={m} className="glass-card" style={{ padding: "var(--space-4)", background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            
            {/* High-Contrast Clear Month Banner Header */}
            <div
              style={{
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 0",
                marginBottom: "var(--space-3)"
              }}
            >
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#ffffff", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                {m} {year}
              </h4>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "11px" }}>
              {dayLabels.map((lbl, idx) => (
                <div key={idx} style={{ color: "#cbd5e1", fontWeight: 800, paddingBottom: "4px" }}>{lbl}</div>
              ))}
              
              {daysArray.map((day, dayIdx) => {
                if (!day) return <div key={`empty-${dayIdx}`} />;
                const status = getDateStatus(day);

                let bg = "rgba(255, 255, 255, 0.05)";
                let color = "#f8fafc";
                let border = "1px solid rgba(255, 255, 255, 0.08)";
                let shadow = "none";

                if (status === "APPROVED") {
                  bg = "#10b981"; // Bright Emerald
                  color = "#ffffff";
                  border = "1px solid #059669";
                  shadow = "0 0 8px rgba(16, 185, 129, 0.5)";
                } else if (status === "PENDING") {
                  bg = "#f59e0b"; // Vibrant Amber
                  color = "#0f172a";
                  border = "1px solid #d97706";
                  shadow = "0 0 8px rgba(245, 158, 11, 0.5)";
                } else if (status === "REJECTED") {
                  bg = "#ef4444"; // Crimson Red
                  color = "#ffffff";
                  border = "1px solid #dc2626";
                  shadow = "0 0 8px rgba(239, 68, 68, 0.4)";
                }

                return (
                  <div
                    key={dayIdx}
                    style={{
                      width: "24px",
                      height: "24px",
                      lineHeight: "22px",
                      borderRadius: "6px",
                      background: bg,
                      color: color,
                      border: border,
                      boxShadow: shadow,
                      margin: "0 auto",
                      fontWeight: status ? 800 : 500,
                      fontSize: "11px"
                    }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeavesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHrTab, setActiveHrTab] = useState<"registry" | "myleaves">("registry");

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
  
  // Custom Time Off Request Modal State
  const [isApplying, setIsApplying] = useState(false);
  const [leaveType, setLeaveType] = useState("Paid Time off");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const [hrComment, setHrComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadLeaves = async () => {
    try {
      const storedUser = localStorage.getItem("dayflow_user");
      if (!storedUser) return;
      const sess = JSON.parse(storedUser);

      if (sess.role === "HR" || sess.role === "ADMIN") {
        const [leavesData, prof] = await Promise.all([
          fetchLeaves(),
          fetchProfile(sess.id)
        ]);
        setLeaves(leavesData);
        setProfileUser(prof);
      } else {
        const targetId = sess.id;
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

  // Calculate leave days count (excluding weekends)
  const getLeaveDaysDuration = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat/Sun
        count++;
      }
    }
    return count;
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await applyLeave({
        userId: currentUser.id,
        leaveType,
        startDate,
        endDate,
        remarks: remarks || undefined,
      });

      setIsApplying(false);
      setRemarks("");
      setAttachmentName("");
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

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading logs...
      </div>
    );
  }

  const isHr = currentUser.role === "HR" || currentUser.role === "ADMIN";
  const isAdmin = currentUser.role === "ADMIN";

  // Filter user's own leaves for quota calculation & personal calendar
  const myLeaves = leaves.filter((l) => l.userId === currentUser.id);

  // Calculate available days (Paid quota = 24 base, Sick quota = 7 base)
  const approvedPaidLeaves = myLeaves.filter((l) => l.leaveType === "Paid Time off" && l.status === "APPROVED");
  const approvedSickLeaves = myLeaves.filter((l) => l.leaveType === "Sick Leave" && l.status === "APPROVED");

  const paidDaysUsed = approvedPaidLeaves.reduce((acc, l) => acc + getLeaveDaysDuration(l.startDate, l.endDate), 0);
  const sickDaysUsed = approvedSickLeaves.reduce((acc, l) => acc + getLeaveDaysDuration(l.startDate, l.endDate), 0);

  const paidDaysAvailable = Math.max(0, 24 - paidDaysUsed);
  const sickDaysAvailable = Math.max(0, 7 - sickDaysUsed);

  // Filter leave requests for search query & approval permissions (excluding own leaves from registry approval list)
  const filteredRegistryLeaves = leaves.filter((l) => {
    // 1. HR cannot approve their own leaves in employee registry
    if (l.userId === currentUser.id) return false;

    // 2. HR can only see and approve leave requests of regular employees
    if (currentUser.role === "HR" && l.user?.role !== "EMPLOYEE") return false;

    if (!searchQuery) return true;
    return (
      l.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.leaveType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const durationDays = getLeaveDaysDuration(startDate, endDate);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Top Page Header Bar with Apply Leave Button for HR & Staff */}
        <header className="page-header animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Time Off & Leave Management</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
              {isAdmin ? "System overview of employee leave requests" : isHr ? "Manage employee leave requests and apply for time off" : `Manage leaves for ${profileUser?.name || currentUser.name}`}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setIsApplying(true)}
              className="btn-primary"
              id="apply-leave-btn"
            >
              + Apply Leave Request
            </button>
          )}
        </header>

        {/* Quota Indicators - Hidden for Admin */}
        {!isAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-4)" }}>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>My Paid Time Off</span>
              <h2 style={{ margin: "4px 0 0 0", color: "var(--text-accent)" }}>{paidDaysAvailable.toString().padStart(2, "0")} Days Available</h2>
            </div>
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-4)" }}>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>My Sick Time Off</span>
              <h2 style={{ margin: "4px 0 0 0", color: "var(--warning)" }}>{sickDaysAvailable.toString().padStart(2, "0")} Days Available</h2>
            </div>
          </div>
        )}

        {/* ========================================================
           HR / ADMIN VIEW - TABS (REGISTRY VS MY LEAVES)
           ======================================================== */}
        {isHr ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            {/* HR Tabs (Hidden for Admin who only sees registry) */}
            {!isAdmin && (
              <div style={{ display: "flex", gap: "var(--space-4)", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <button
                  onClick={() => setActiveHrTab("registry")}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    background: activeHrTab === "registry" ? "var(--bg-glass-hover)" : "none",
                    border: "none",
                    borderBottom: activeHrTab === "registry" ? "2px solid var(--text-accent)" : "2px solid transparent",
                    color: activeHrTab === "registry" ? "var(--text-accent)" : "var(--text-secondary)",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)"
                  }}
                  id="hr-tab-registry"
                >
                  Employee Requests Registry ({filteredRegistryLeaves.length})
                </button>
                <button
                  onClick={() => setActiveHrTab("myleaves")}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    background: activeHrTab === "myleaves" ? "var(--bg-glass-hover)" : "none",
                    border: "none",
                    borderBottom: activeHrTab === "myleaves" ? "2px solid var(--text-accent)" : "2px solid transparent",
                    color: activeHrTab === "myleaves" ? "var(--text-accent)" : "var(--text-secondary)",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)"
                  }}
                  id="hr-tab-myleaves"
                >
                  My Time-Off Requests ({myLeaves.length})
                </button>
              </div>
            )}

            {(isAdmin || activeHrTab === "registry") ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {/* HR controls bar */}
                <div className="glass-card">
                  <div className="glass-card__body" style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Search leave requests by employee or type..."
                      className="form-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ maxWidth: "480px" }}
                      id="hr-leaves-search"
                    />
                    
                    <input
                      type="text"
                      placeholder="Add feedback comment for approval/rejection..."
                      className="form-input"
                      value={hrComment}
                      onChange={(e) => setHrComment(e.target.value)}
                      style={{ flex: 1 }}
                      id="hr-leave-comment"
                    />
                  </div>
                </div>

                {/* Leaves Request Table */}
                <div className="glass-card">
                  <div className="glass-card__header">
                    <h2>Time Off Logs Registry</h2>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                      {filteredRegistryLeaves.length} requests total
                    </span>
                  </div>

                  <div className="glass-card__body" style={{ padding: 0 }}>
                    {filteredRegistryLeaves.length > 0 ? (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Name</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Start Date</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>End Date</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Time off Type</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "center" }}>Status & Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRegistryLeaves.map((request) => (
                              <tr key={request.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                                <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600 }}>{request.user?.name}</td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                  {new Date(request.startDate).toLocaleDateString([], { timeZone: "UTC" })}
                                </td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                  {new Date(request.endDate).toLocaleDateString([], { timeZone: "UTC" })}
                                </td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-primary)" }}>{request.leaveType}</td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", display: "flex", justifyContent: "center", gap: "var(--space-2)" }}>
                                  {request.status === "PENDING" ? (
                                    <>
                                      <button
                                        onClick={() => handleReject(request.id)}
                                        style={{
                                          background: "var(--danger)",
                                          border: "none",
                                          color: "white",
                                          padding: "6px 12px",
                                          borderRadius: "var(--radius-sm)",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                          fontSize: "11px"
                                        }}
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleApprove(request.id)}
                                        style={{
                                          background: "var(--success)",
                                          border: "none",
                                          color: "white",
                                          padding: "6px 12px",
                                          borderRadius: "var(--radius-sm)",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                          fontSize: "11px"
                                        }}
                                      >
                                        Approve
                                      </button>
                                    </>
                                  ) : (
                                    <span className="status-badge" style={getStatusStyle(request.status)}>
                                      {request.status}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">No leaves logged in registry.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* HR Personal Leaves Tab */
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
                {/* 12-Month Calendar Grid */}
                <div className="glass-card animate-in" style={{ padding: "var(--space-6)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                    <h2 style={{ margin: 0 }}>My Time-Off Leave Calendar</h2>
                  </div>
                  <CalendarYearGrid leaves={myLeaves} />
                </div>

                {/* HR Personal Requests Table */}
                <div className="glass-card animate-in" id="hr-my-leaves-card">
                  <div className="glass-card__header">
                    <h2>My Applications Log</h2>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                      {myLeaves.length} applications
                    </span>
                  </div>

                  <div className="glass-card__body" style={{ padding: 0 }}>
                    {myLeaves.length > 0 ? (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Type</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Start Date</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>End Date</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Remarks</th>
                              <th style={{ padding: "var(--space-4) var(--space-6)" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myLeaves.map((leave) => (
                              <tr key={leave.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                                <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 500 }}>
                                  {leave.leaveType}
                                </td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                  {new Date(leave.startDate).toLocaleDateString([], { timeZone: "UTC" })}
                                </td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                  {new Date(leave.endDate).toLocaleDateString([], { timeZone: "UTC" })}
                                </td>
                                <td style={{ padding: "var(--space-4) var(--space-6)", fontStyle: "italic", fontSize: "var(--font-sm)", color: "var(--text-tertiary)" }}>
                                  {leave.remarks || "—"}
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
                      <div className="empty-state">No requests registered yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
             EMPLOYEE VIEW - 12 MONTH CALENDAR GRID & HISTORICAL LOG
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            
            {/* 12-Month Calendar Grid */}
            <div className="glass-card animate-in animate-in-delay-1" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <h2 style={{ margin: 0 }}>Time-Off Leave Calendar</h2>
                {/* Legenda */}
                <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--font-xs)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }} />
                    Validated / Approved
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)" }} />
                    To Approve / Pending
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                    Refused / Rejected
                  </div>
                </div>
              </div>
              <CalendarYearGrid leaves={leaves} />
            </div>

            {/* Employee Request History Table */}
            <div className="glass-card animate-in animate-in-delay-2" id="leaves-history-card">
              <div className="glass-card__header">
                <h2>My Applications Log</h2>
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
                          <tr key={leave.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                            <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 500 }}>
                              {leave.leaveType}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                              {new Date(leave.startDate).toLocaleDateString([], { timeZone: "UTC" })}
                            </td>
                            <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                              {new Date(leave.endDate).toLocaleDateString([], { timeZone: "UTC" })}
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
                  <div className="empty-state">No requests registered.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CUSTOM TIME OFF TYPE REQUEST MODAL */}
      {isApplying && (
        <div className="modal-overlay" onClick={() => setIsApplying(false)}>
          <form
            onSubmit={handleApplyLeave}
            className="modal"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h3 className="modal__title">Time off Type Request</h3>
              <button type="button" className="modal__close" onClick={() => setIsApplying(false)}>×</button>
            </div>
            
            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              
              <div className="form-group">
                <label className="form-label">Employee</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileUser?.name || currentUser.name}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time off Type</label>
                <select
                  className="form-input"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  id="leave-type-select"
                >
                  <option value="Paid Time off">Paid Time off</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Unpaid Leaves">Unpaid Leaves</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    id="leave-start-date"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    id="leave-end-date"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allocation (Days Duration)</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${durationDays.toFixed(2)} Days`}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed", fontWeight: "bold", color: "var(--text-accent)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attachment (For sick leave certificate)</label>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setAttachmentName("medical_certificate_sealed.pdf");
                      alert("Certificate selected successfully!");
                    }}
                    id="upload-certificate-btn"
                  >
                    📤 Upload Certificate
                  </button>
                  {attachmentName && (
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--success)" }}>
                      ✓ {attachmentName}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Annual summer travel or doctor appointment"
                />
              </div>

            </div>

            <div className="modal__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
              <button type="button" className="btn-ghost" onClick={() => setIsApplying(false)}>Discard</button>
              <button type="submit" className="btn-primary" id="submit-leave-btn">Submit</button>
            </div>
          </form>
        </div>
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
