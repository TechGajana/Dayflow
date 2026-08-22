"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchAttendance, fetchProfile, Attendance, User } from "@/lib/api";

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const sess = JSON.parse(storedUser);
    setCurrentUser(sess);

    const targetId = userId || sess.id;

    const loadLogs = async () => {
      try {
        const [attLogs, prof] = await Promise.all([
          fetchAttendance(targetId),
          fetchProfile(targetId)
        ]);
        setLogs(attLogs);
        setProfileUser(prof);
      } catch (err) {
        console.error("Failed to load attendance logs:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [router, userId]);

  const calculateHours = (inStr: string | null, outStr: string | null) => {
    if (!inStr) return "—";
    const start = new Date(inStr).getTime();
    const end = outStr ? new Date(outStr).getTime() : new Date().getTime();
    const diff = end - start;

    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m${!outStr ? " (Active)" : ""}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PRESENT":
        return { background: "rgba(52, 211, 153, 0.1)", color: "var(--success)", borderColor: "rgba(52, 211, 153, 0.2)" };
      case "ABSENT":
        return { background: "rgba(248, 113, 113, 0.1)", color: "var(--danger)", borderColor: "rgba(248, 113, 113, 0.2)" };
      case "HALFDAY":
        return { background: "rgba(251, 191, 36, 0.1)", color: "var(--warning)", borderColor: "rgba(251, 191, 36, 0.2)" };
      default:
        return { background: "var(--bg-glass)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" };
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
        <header className="page-header animate-in">
          <div>
            <h1>Attendance History</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
              Viewing logs for {profileUser?.name || "Employee"} ({profileUser?.employeeId || "—"})
            </p>
          </div>
        </header>

        <div className="glass-card animate-in animate-in-delay-1" id="attendance-logs-card">
          <div className="glass-card__header">
            <h2>Log Sheet</h2>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
              {logs.length} logs
            </span>
          </div>

          <div className="glass-card__body" style={{ padding: 0 }}>
            {logs.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Date</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check-In</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check-Out</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Duration</th>
                      <th style={{ padding: "var(--space-4) var(--space-6)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-primary)", transition: "background var(--transition-fast)" }} className="content-section">
                        <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 500 }}>
                          {new Date(log.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                          {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                          {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-primary)", fontWeight: 600 }}>
                          {calculateHours(log.checkIn, log.checkOut)}
                        </td>
                        <td style={{ padding: "var(--space-4) var(--space-6)" }}>
                          <span className="status-badge" style={getStatusStyle(log.status)}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon">⏰</div>
                <p className="empty-state__text">No check-in logs recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading logs...
      </div>
    }>
      <AttendanceContent />
    </Suspense>
  );
}
