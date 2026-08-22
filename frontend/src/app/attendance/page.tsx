"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchAttendance, fetchProfile, fetchAllProfiles, fetchLeaves, Attendance, User, UserBrief, LeaveRequest } from "@/lib/api";

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserBrief[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation state (for Employee view)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // HR Date Filter State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hrSearchQuery, setHrSearchQuery] = useState("");

  const loadData = async () => {
    try {
      const storedUser = localStorage.getItem("dayflow_user");
      if (!storedUser) return;
      const sess = JSON.parse(storedUser);
      setCurrentUser(sess);

      if (sess.role === "HR") {
        const [allLogs, users] = await Promise.all([
          fetchAttendance(),
          fetchAllProfiles()
        ]);
        setLogs(allLogs);
        setAllProfiles(users);
      } else {
        // Staff role: strictly view own attendance details
        const targetId = sess.id;
        const [attLogs, prof, leavesData] = await Promise.all([
          fetchAttendance(targetId),
          fetchProfile(targetId),
          fetchLeaves(targetId)
        ]);
        setLogs(attLogs);
        setProfileUser(prof);
        setAllLeaves(leavesData);
      }
    } catch (err) {
      console.error("Failed to load attendance metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("attendanceUpdate", loadData);
    return () => window.removeEventListener("attendanceUpdate", loadData);
  }, [router, userId]);

  // Formatter for check-in / out times (HH:MM)
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—";
    const d = new Date(timeStr);
    const hrs = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  // Date formatter (DD/MM/YYYY)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getUTCDate().toString().padStart(2, "0");
    const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate work duration in decimal hours
  const calculateWorkHours = (inStr: string | null, outStr: string | null) => {
    if (!inStr) return 0;
    const start = new Date(inStr).getTime();
    const end = outStr ? new Date(outStr).getTime() : new Date().getTime();
    return (end - start) / 3600000;
  };

  // Formats decimal hours into HH:MM
  const formatHours = (hoursDecimal: number) => {
    if (hoursDecimal <= 0) return "00:00";
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

  // Date Navigation Helpers (Month shift)
  const shiftMonth = (direction: number) => {
    let nextMonth = selectedMonth + direction;
    let nextYear = selectedYear;

    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  // Weekdays count in month (excluding Sat/Sun)
  const getWorkingDaysInMonth = (month: number, year: number) => {
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return count;
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading logs...
      </div>
    );
  }

  const isHr = currentUser.role === "HR";

  // Filter logs for HR select date
  const filteredHrLogs = logs.filter((log) => {
    const logDate = new Date(log.date).toDateString();
    const filterDate = selectedDate.toDateString();
    if (logDate !== filterDate) return false;

    if (hrSearchQuery) {
      const emp = allProfiles.find((p) => p.id === log.userId);
      return emp?.name.toLowerCase().includes(hrSearchQuery.toLowerCase());
    }
    return true;
  });

  // Filter logs for Employee selected month
  const filteredEmployeeLogs = logs.filter((log) => {
    const logDate = new Date(log.date);
    return (
      logDate.getUTCMonth() === selectedMonth &&
      logDate.getUTCFullYear() === selectedYear
    );
  });

  // Calculate Employee Metrics
  const daysPresent = filteredEmployeeLogs.filter((l) => l.status === "PRESENT").length;

  // Calculate Leave Days in selected month
  let leaveDaysCount = 0;
  allLeaves.forEach((leave) => {
    if (leave.status !== "APPROVED") return;

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);

    // Count overlap days with the selected month/year
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        // Only count weekdays
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          leaveDaysCount++;
        }
      }
    }
  });

  const totalWorkingDays = getWorkingDaysInMonth(selectedMonth, selectedYear);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
                  <button onClick={() => {
                    const copy = new Date(selectedDate);
                    copy.setDate(selectedDate.getDate() - 1);
                    setSelectedDate(copy);
                  }} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-3)" }}>
                    ◀
                  </button>
                  <button onClick={() => {
                    const copy = new Date(selectedDate);
                    copy.setDate(selectedDate.getDate() + 1);
                    setSelectedDate(copy);
                  }} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-3)" }}>
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
             EMPLOYEE ATTENDANCE DASHBOARD WITH SUMMARY CARDS
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            {/* Header Controls with Switch Month / Dropdown */}
            <div className="glass-card animate-in">
              <div className="glass-card__body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-4)" }}>
                
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <button onClick={() => shiftMonth(-1)} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-4)" }} id="prev-month-btn">
                    &lt;-
                  </button>
                  <button onClick={() => shiftMonth(1)} className="btn-ghost" style={{ padding: "var(--space-2) var(--space-4)" }} id="next-month-btn">
                    -&gt;
                  </button>

                  <select
                    className="form-input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{ maxWidth: "150px", display: "inline-block" }}
                    id="month-select"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: "var(--font-md)", fontWeight: 600 }}>{selectedYear}</span>
                </div>

                <div style={{ fontSize: "var(--font-lg)", fontWeight: 700 }}>
                  Attendance Sheet
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
              {/* Present days */}
              <div className="glass-card animate-in animate-in-delay-1" style={{ textAlign: "center" }}>
                <div className="glass-card__body" style={{ padding: "var(--space-6)" }}>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Count of days present</span>
                  <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "var(--space-2) 0 0 0", color: "var(--success)" }} id="days-present-card">
                    {daysPresent}
                  </h2>
                </div>
              </div>
              {/* Leaves count */}
              <div className="glass-card animate-in animate-in-delay-1" style={{ textAlign: "center" }}>
                <div className="glass-card__body" style={{ padding: "var(--space-6)" }}>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Leaves count</span>
                  <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "var(--space-2) 0 0 0", color: "#3b82f6" }} id="leaves-count-card">
                    {leaveDaysCount}
                  </h2>
                </div>
              </div>
              {/* Total working days */}
              <div className="glass-card animate-in animate-in-delay-1" style={{ textAlign: "center" }}>
                <div className="glass-card__body" style={{ padding: "var(--space-6)" }}>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total working days</span>
                  <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "var(--space-2) 0 0 0", color: "var(--text-accent)" }} id="working-days-card">
                    {totalWorkingDays}
                  </h2>
                </div>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="glass-card animate-in animate-in-delay-2" id="employee-attendance-card">
              <div className="glass-card__header">
                <h2>{months[selectedMonth]} {selectedYear} Logs</h2>
              </div>

              <div className="glass-card__body" style={{ padding: 0 }}>
                {filteredEmployeeLogs.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-tertiary)", fontSize: "var(--font-xs)", textTransform: "uppercase" }}>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Date</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check In</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Check Out</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Work Hours</th>
                          <th style={{ padding: "var(--space-4) var(--space-6)" }}>Extra hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployeeLogs.map((log) => {
                          const hrs = calculateWorkHours(log.checkIn, log.checkOut);
                          return (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-primary)" }} className="content-section">
                              <td style={{ padding: "var(--space-4) var(--space-6)", fontWeight: 600 }}>
                                {formatDate(log.date)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkIn)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-secondary)" }}>
                                {formatTime(log.checkOut)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-primary)", fontWeight: 700 }}>
                                {formatHours(hrs)}
                              </td>
                              <td style={{ padding: "var(--space-4) var(--space-6)", color: "var(--text-accent)" }}>
                                {getExtraHours(hrs)}
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
                    <p className="empty-state__text">No check-in logs recorded for this month.</p>
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
