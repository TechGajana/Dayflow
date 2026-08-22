"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("dayflow_user");
    router.push("/login");
  };

  if (!user) return null;

  const links = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "My Profile", href: `/profile?id=${user.id}`, icon: "👤" },
    { label: "Attendance", href: `/attendance?id=${user.id}`, icon: "⏰" },
    { label: "Leave Requests", href: `/leaves?id=${user.id}`, icon: "📅" },
    { label: "Payroll / Payslip", href: `/payroll?id=${user.id}`, icon: "💰" },
  ];

  return (
    <div
      className="glass-card"
      style={{
        width: "260px",
        height: "calc(100vh - 48px)",
        position: "sticky",
        top: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "var(--space-6) var(--space-4)",
        flexShrink: 0
      }}
    >
      <div>
        <div style={{ padding: "0 var(--space-4)", marginBottom: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--font-xl)", fontWeight: 800, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Dayflow
          </h2>
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
            HR Management System
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {links.map((link) => {
            const isActive = pathname === link.href.split("?")[0];
            return (
              <button
                key={link.label}
                onClick={() => router.push(link.href)}
                className={`tab-button ${isActive ? "active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: isActive ? "var(--bg-glass-hover)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 500,
                  transition: "all var(--transition-fast)"
                }}
              >
                <span style={{ fontSize: "var(--font-md)" }}>{link.icon}</span>
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border-primary)",
          paddingTop: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)"
        }}
      >
        <div style={{ padding: "0 var(--space-4)" }}>
          <div style={{ fontWeight: 600, fontSize: "var(--font-base)", color: "var(--text-primary)" }}>
            {user.name}
          </div>
          <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", textTransform: "capitalize" }}>
            {user.role.toLowerCase()} Account
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn-ghost"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            borderColor: "rgba(248, 113, 113, 0.3)",
            color: "var(--danger)",
            background: "rgba(248, 113, 113, 0.05)"
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
