"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  fetchTodayAttendance,
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  fetchLeaves,
  approveLeave,
  rejectLeave,
  fetchAllProfiles,
  fetchAttendance,
  UserBrief,
  Attendance,
  LeaveRequest
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Employee State
  const [todayLog, setTodayLog] = useState<Attendance | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [ownLeaves, setOwnLeaves] = useState<LeaveRequest[]>([]);

  // HR State
  const [employees, setEmployees] = useState<UserBrief[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [hrComment, setHrComment] = useState("");

  // Load User and Metrics
  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    const loadData = async () => {
      try {
        if (user.role === "HR") {
          const [emps, atts, lvs] = await Promise.all([
            fetchAllProfiles(),
            fetchAttendance(),
            fetchLeaves()
          ]);
          setEmployees(emps);
          setAllAttendance(atts);
          setAllLeaves(lvs);
        } else {
          const [log, lvs] = await Promise.all([
            fetchTodayAttendance(user.id),
            fetchLeaves(user.id)
          ]);
          setTodayLog(log);
          setOwnLeaves(lvs);
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Active checkin timer logic
  useEffect(() => {
    if (!todayLog?.checkIn || todayLog.checkOut) {
      setElapsedTime("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(todayLog.checkIn!).getTime();
      const now = new Date().getTime();
      const diff = now - start;

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      const format = (n: number) => n.toString().padStart(2, "0");
      setElapsedTime(`${format(hrs)}:${format(mins)}:${format(secs)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayLog]);

  const handleCheckIn = async () => {
    if (!currentUser) return;
    try {
      const log = await apiCheckIn(currentUser.id);
      setTodayLog(log);
    } catch (err: any) {
      alert(err.message || "Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      const log = await apiCheckOut(currentUser.id);
      setTodayLog(log);
    } catch (err: any) {
      alert(err.message || "Failed to check out");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave(id, hrComment);
      setHrComment("");
      // Reload leaves queue
      const lvs = await fetchLeaves();
      setAllLeaves(lvs);
    } catch (err) {
      alert("Failed to approve leave");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLeave(id, hrComment);
      setHrComment("");
      // Reload leaves queue
      const lvs = await fetchLeaves();
      setAllLeaves(lvs);
    } catch (err) {
      alert("Failed to reject leave");
    }
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading HRMS Dashboard...
      </div>
    );
  }

  const isHr = currentUser.role === "HR";

  // Calculate Aggregates for HR
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const presentTodayCount = allAttendance.filter(
    (a) => new Date(a.date).getTime() >= todayStart.getTime() && a.status === "PRESENT"
  ).length;

  const pendingLeaves = allLeaves.filter((l) => l.status === "PENDING");

  return (
    <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
      <Sidebar />

      <div style={{ flex: 1 }}>
        {/* Welcome Header */}
        <header className="page-header animate-in" style={{ marginBottom: "var(--space-6)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
              Welcome back, {currentUser.name}. You are logged in as {isHr ? "HR Manager" : "Employee"}.
            </p>
          </div>
          <div className="status-badge">
            <span className="status-badge__dot" />
            Live
          </div>
        </header>

        {/* Dynamic Role Views */}
        {!isHr ? (
          /* ========================================================
             EMPLOYEE VIEW
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Clock Card */}
            <div className="glass-card animate-in animate-in-delay-1">
              <div className="glass-card__header">
                <h2>Workday Attendance Status</h2>
                <span className="status-badge" style={{ background: todayLog?.checkIn ? "rgba(52, 211, 153, 0.1)" : "rgba(248, 113, 113, 0.1)", color: todayLog?.checkIn ? "var(--success)" : "var(--danger)", borderColor: todayLog?.checkIn ? "rgba(52, 211, 153, 0.2)" : "rgba(248, 113, 113, 0.2)" }}>
                  {todayLog?.checkIn ? (todayLog.checkOut ? "Checked Out" : "Checked In") : "Not Active"}
                </span>
              </div>
              <div className="glass-card__body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-6)" }}>
                <div>
                  <div style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>
                    Active Work Timer
                  </div>
                  <div style={{ fontSize: "40px", fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)", margin: "4px 0" }}>
                    {elapsedTime}
                  </div>
                  {todayLog?.checkIn && (
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                      Checked in at {new Date(todayLog.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {todayLog.checkOut && ` • Checked out at ${new Date(todayLog.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "var(--space-4)" }}>
                  {!todayLog?.checkIn ? (
                    <button onClick={handleCheckIn} className="btn-primary" style={{ padding: "var(--space-4) var(--space-6)", fontSize: "var(--font-md)" }} id="checkin-btn">
                      ⏱️ Check In
                    </button>
                  ) : !todayLog.checkOut ? (
                    <button onClick={handleCheckOut} className="btn-primary" style={{ padding: "var(--space-4) var(--space-6)", fontSize: "var(--font-md)", background: "var(--danger)", boxShadow: "0 2px 8px rgba(248, 113, 113, 0.3)" }} id="checkout-btn">
                      🛑 Check Out
                    </button>
                  ) : (
                    <button disabled className="btn-ghost" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      ✓ Day Logged
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-6)" }}>
              <div className="glass-card animate-in animate-in-delay-2" style={{ cursor: "pointer" }} onClick={() => router.push(`/profile?id=${currentUser.id}`)}>
                <div className="glass-card__body" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  <div style={{ fontSize: "36px", marginBottom: "var(--space-3)" }}>👤</div>
                  <h3>My Profile</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-xs)", marginTop: "4px" }}>
                    View job details, manager, skills, and certifications.
                  </p>
                </div>
              </div>

              <div className="glass-card animate-in animate-in-delay-2" style={{ cursor: "pointer" }} onClick={() => router.push(`/leaves?id=${currentUser.id}`)}>
                <div className="glass-card__body" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  <div style={{ fontSize: "36px", marginBottom: "var(--space-3)" }}>📅</div>
                  <h3>Leave Requests</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-xs)", marginTop: "4px" }}>
                    Submit leave applications and track approval statuses.
                  </p>
                </div>
              </div>

              <div className="glass-card animate-in animate-in-delay-2" style={{ cursor: "pointer" }} onClick={() => router.push(`/payroll?id=${currentUser.id}`)}>
                <div className="glass-card__body" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  <div style={{ fontSize: "36px", marginBottom: "var(--space-3)" }}>💰</div>
                  <h3>My Payslip</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-xs)", marginTop: "4px" }}>
                    View salary structure, allowances, and generated payslips.
                  </p>
                </div>
              </div>
            </div>

            {/* Alerts / Activity */}
            <div className="glass-card animate-in animate-in-delay-3">
              <div className="glass-card__header">
                <h2>Recent Requests & Alerts</h2>
              </div>
              <div className="glass-card__body" style={{ padding: "0" }}>
                {ownLeaves.length > 0 ? (
                  ownLeaves.slice(0, 3).map((leave) => (
                    <div key={leave.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--border-primary)" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Leave Request: {leave.leaveType}</div>
                        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                          {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="status-badge" style={{
                        background: leave.status === "APPROVED" ? "rgba(52, 211, 153, 0.1)" : leave.status === "REJECTED" ? "rgba(248, 113, 113, 0.1)" : "rgba(250, 204, 21, 0.1)",
                        color: leave.status === "APPROVED" ? "var(--success)" : leave.status === "REJECTED" ? "var(--danger)" : "var(--warning)",
                        borderColor: leave.status === "APPROVED" ? "rgba(52, 211, 153, 0.2)" : leave.status === "REJECTED" ? "rgba(248, 113, 113, 0.2)" : "rgba(250, 204, 21, 0.2)"
                      }}>
                        {leave.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No recent leave logs found.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             HR / ADMIN VIEW
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* KPI Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-6)" }}>
              <div className="glass-card animate-in animate-in-delay-1">
                <div className="glass-card__body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>Total Headcount</span>
                    <h2 style={{ fontSize: "32px", fontWeight: 700, margin: "4px 0" }}>{employees.length}</h2>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Registered staff</span>
                  </div>
                  <div style={{ fontSize: "40px" }}>👥</div>
                </div>
              </div>

              <div className="glass-card animate-in animate-in-delay-1">
                <div className="glass-card__body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>Present Today</span>
                    <h2 style={{ fontSize: "32px", fontWeight: 700, margin: "4px 0" }}>{presentTodayCount}</h2>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Checked-in employees</span>
                  </div>
                  <div style={{ fontSize: "40px" }}>⏰</div>
                </div>
              </div>

              <div className="glass-card animate-in animate-in-delay-1">
                <div className="glass-card__body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>Pending Leaves</span>
                    <h2 style={{ fontSize: "32px", fontWeight: 700, margin: "4px 0" }}>{pendingLeaves.length}</h2>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Requires review</span>
                  </div>
                  <div style={{ fontSize: "40px" }}>📅</div>
                </div>
              </div>
            </div>

            {/* Employee quick selector context */}
            <div className="glass-card animate-in animate-in-delay-2">
              <div className="glass-card__header">
                <h2>Manage Employees</h2>
              </div>
              <div className="glass-card__body" style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)" }}>Quick View Employee Profile:</span>
                <select
                  className="form-input"
                  style={{ maxWidth: "320px", display: "inline-block" }}
                  onChange={(e) => {
                    if (e.target.value) {
                      router.push(`/profile?id=${e.target.value}`);
                    }
                  }}
                  id="employee-quick-select"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId}) - {emp.title || "No Title"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leave Approval Queue */}
            <div className="glass-card animate-in animate-in-delay-3" id="leaves-approval-card">
              <div className="glass-card__header">
                <h2>Pending Leaves Approvals Queue</h2>
              </div>
              <div className="glass-card__body">
                {pendingLeaves.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                      <input
                        type="text"
                        placeholder="Add feedback / approval comment..."
                        className="form-input"
                        value={hrComment}
                        onChange={(e) => setHrComment(e.target.value)}
                        style={{ flex: 1 }}
                        id="approval-comment-input"
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
          </div>
        )}
      </div>
    </div>
  );
}
