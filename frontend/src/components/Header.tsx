"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchTodayAttendance, checkIn, checkOut } from "@/lib/api";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const checkStatus = async () => {
      try {
        const todayLog = await fetchTodayAttendance(parsedUser.id);
        setCheckedIn(!!todayLog && !todayLog.checkOut);
      } catch (err) {
        console.error("Failed to check active checkin:", err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    checkStatus();
  }, [router]);

  const handleCheckInOut = async () => {
    if (!user) return;
    try {
      if (checkedIn) {
        await checkOut(user.id);
        setCheckedIn(false);
      } else {
        await checkIn(user.id);
        setCheckedIn(true);
      }
      // Broadcast state update event so active page (e.g. Dashboard) can refresh its timer
      window.dispatchEvent(new Event("attendanceUpdate"));
    } catch (err: any) {
      alert(err.message || "Failed to update attendance status");
    }
  };

  const handleLogout = () => {
    router.push("/logout");
  };

  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="glass-card animate-in"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-8)",
        borderRadius: 0,
        borderLeft: "none",
        borderRight: "none",
        borderTop: "none",
        position: "sticky",
        top: 0,
        zIndex: 50,
        margin: "0 0 var(--space-6) 0",
        backdropFilter: "blur(20px)",
        background: "rgba(15, 23, 42, 0.75)"
      }}
    >
      {/* Left: Logo & Company */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
        <div
          onClick={() => router.push(user.role === "EMPLOYEE" ? `/profile?id=${user.id}` : "/dashboard")}
          style={{
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "var(--font-xl)",
            background: "var(--accent-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Dayflow
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            onClick={() => router.push(user.role === "EMPLOYEE" ? `/profile?id=${user.id}` : "/dashboard")}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: (pathname === "/dashboard" || (pathname === "/profile" && user.role === "EMPLOYEE")) ? "var(--bg-glass-hover)" : "none",
              border: "none",
              color: (pathname === "/dashboard" || (pathname === "/profile" && user.role === "EMPLOYEE")) ? "var(--text-accent)" : "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {user.role === "EMPLOYEE" ? "My Profile" : "Employees"}
          </button>
          <button
            onClick={() => router.push(`/attendance?id=${user.id}`)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: pathname === "/attendance" ? "var(--bg-glass-hover)" : "none",
              border: "none",
              color: pathname === "/attendance" ? "var(--text-accent)" : "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              fontWeight: pathname === "/attendance" ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Attendance
          </button>
          <button
            onClick={() => router.push(`/leaves?id=${user.id}`)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: pathname === "/leaves" ? "var(--bg-glass-hover)" : "none",
              border: "none",
              color: pathname === "/leaves" ? "var(--text-accent)" : "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              fontWeight: pathname === "/leaves" ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Time Off
          </button>
        </nav>
      </div>

      {/* Right: CheckIn indicator + Profile Avatar Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
        {/* Attendance status indicator widget */}
        {!loadingAttendance && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: checkedIn ? "var(--success)" : "var(--danger)",
                boxShadow: checkedIn ? "0 0 10px var(--success)" : "0 0 10px var(--danger)"
              }}
            />
            <button
              onClick={handleCheckInOut}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "var(--font-sm)",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              id="header-check-toggle"
            >
              {checkedIn ? "Check Out →" : "Check IN →"}
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            fontSize: "var(--font-sm)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
            e.currentTarget.style.color = "#f87171";
          }}
          id="header-logout-btn"
        >
          🚪 Log Out
        </button>

        {/* Profile Avatar Dropdown */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "var(--accent-gradient)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "var(--font-sm)",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            {initials}
          </div>

          {showDropdown && (
            <>
              {/* Overlay background to close dropdown */}
              <div
                onClick={() => setShowDropdown(false)}
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
              />
              <div
                className="glass-card"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  width: "180px",
                  padding: "var(--space-2) 0",
                  zIndex: 100,
                  boxShadow: "var(--shadow-lg)",
                  background: "rgba(30, 41, 59, 0.95)"
                }}
              >
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push(`/profile?id=${user.id}`);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "var(--space-2) var(--space-4)",
                    background: "none",
                    border: "none",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  id="dropdown-profile-btn"
                >
                  My Profile
                </button>
                <hr style={{ border: "none", borderTop: "1px solid var(--border-primary)", margin: "var(--space-1) 0" }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "var(--space-2) var(--space-4)",
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  id="dropdown-logout-btn"
                >
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
