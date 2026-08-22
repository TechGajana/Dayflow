"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchAttendance, fetchProfile, fetchAllProfiles, Attendance, User, UserBrief } from "@/lib/api";

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // HR Date Filter State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hrSearchQuery, setHrSearchQuery] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const sess = JSON.parse(storedUser);
    setCurrentUser(sess);

    const loadData = async () => {
      try {
        if (sess.role === "HR") {
          const [allLogs, users] = await Promise.all([
            fetchAttendance(), // Loads all logs in the database
            fetchAllProfiles()
          ]);
          setLogs(allLogs);
          setAllProfiles(users);
        } else {
          const targetId = userId || sess.id;
          const [attLogs, prof] = await Promise.all([
            fetchAttendance(targetId),
            fetchProfile(targetId)
          ]);
          setLogs(attLogs);
          setProfileUser(prof);
        }
      } catch (err) {
        console.error("Failed to load attendance metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Refresh if header triggers check-in
    window.addEventListener("attendanceUpdate", loadData);
    return () => window.removeEventListener("attendanceUpdate", loadData);
  }, [router, userId]);

  // Formatter for check-in / out times
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—";
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Calculate work duration in hours
  const calculateWorkHours = (inStr: string | null, outStr: string | null) => {
    if (!inStr) return 0;
    const start = new Date(inStr).getTime();
    const end = outStr ? new Date(outStr).getTime() : new Date().getTime();
    return (end - start) / 3600000;
  };

  // Formats decimal hours into HH:MM
  const formatHours = (hoursDecimal: number) => {
    if (hoursDecimal <= 0) return "—";
    const hrs = Math.floor(hoursDecimal);
    const mins = Math.floor((hoursDecimal - hrs) * 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Extra hours calculated as: work hours - 8 hours
  const getExtraHours = (workHoursDecimal: number) => {
    const extra = workHoursDecimal - 8.0;
    if (extra <= 0) return "00:00";
    return formatHours(extra);
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

  // Handle Date Navigation
  const changeDate = (days: number) => {
    const copy = new Date(selectedDate);
    copy.setDate(selectedDate.getDate() + days);
    setSelectedDate(copy);
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading logs...
      </div>
    );
  }

  const isHr = currentUser.role === "HR";

  // Filter logs for the selected date (for HR Manager)
  const filteredHrLogs = logs.filter((log) => {
    const logDate = new Date(log.date).toDateString();
    const filterDate = selectedDate.toDateString();
    if (logDate !== filterDate) return false;

    // Filter by employee name if query exists
    if (hrSearchQuery) {
      const emp = allProfiles.find((p) => p.id === log.userId);
      return emp?.name.toLowerCase().includes(hrSearchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* ========================================================
           HR / ADMIN DAILY REPORT VIEW
           ======================================================== */}
        {isHr ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            {/* Attendance controls card */}
            <div className="glass-card animate-in">
              <div
                className="glass-card__body"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "var(--space-4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <button onClick={() => changeDate(-1)} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-3)" }}>
                    ◀
                  </button>
                  <button onClick={() => changeDate(1)} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-3)" }}>
                    ▶
                  </button>
                  
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(new Date(e.target.value));
                      }
                    }}
                    style={{ maxWidth: "160px", display: "inline-block" }}
                    id="hr-datepicker"
                  />
                </div>

                <div style={{ textAlign: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "var(--font-lg)" }}>
                    {selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </h2>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    className="form-input"
                    value={hrSearchQuery}
                    onChange={(e) => setHrSearchQuery(e.target.value)}
                    style={{ maxWidth: "220px" }}
                    id="hr-attendance-search"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Grid Table */}
            <div className="glass-card animate-in animate-in-delay-1">
              <div className="glass-card__header">
                <h2>All Employee Daily Attendance</h2>
                <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                  {filteredHrLogs.length} present today
                </span>
              </div>

              <div className="glass-card__body" style={{ padding: 0 }}>
                {filteredHrLogs.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Emp</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check In</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check Out</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Work Hours</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Extra hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHrLogs.map((log) => {
                          const emp = allProfiles.find((p) => p.id === log.userId);
                          const workHours = calculateWorkHours(log.checkIn, log.checkOut);

                          return (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                              <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600 }}>
                                {emp?.name || "Unknown Employee"}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkIn)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkOut)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-primary)", fontWeight: 700 }}>
                                {formatHours(workHours)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-accent)" }}>
                                {getExtraHours(workHours)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">⏰</div>
                    <p className="empty-state__text">No attendance records found for this date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             EMPLOYEE INDIVIDUAL MONTH-WISE LIST
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <div className="glass-card animate-in">
              <div className="glass-card__header">
                <h2>Ongoing Month Attendance Logs</h2>
                <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                  Viewing logs for {profileUser?.name || "Employee"} ({profileUser?.employeeId || "—"})
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
                        {logs.map((log) => {
                          const hrs = calculateWorkHours(log.checkIn, log.checkOut);
                          return (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                              <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 500 }}>
                                {new Date(log.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkIn)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkOut)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-primary)", fontWeight: 600 }}>
                                {formatHours(hrs)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)" }}>
                                <span className="status-badge" style={getStatusStyle(log.status)}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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
        )}
      </main>
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
