"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import EditModal from "@/components/EditModal";
import AddUserModal from "@/components/AddUserModal";
import {
  fetchAllProfiles,
  fetchAttendance,
  fetchLeaves,
  createEmployee,
  updateProfile,
  UserBrief,
  Attendance,
  LeaveRequest
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; company: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  // Directory and Status Metrics
  const [employees, setEmployees] = useState<UserBrief[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [todayLeaves, setTodayLeaves] = useState<LeaveRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleTab, setRoleTab] = useState<"ALL" | "EMPLOYEE" | "HR" | "ADMIN">("ALL");

  // Admin Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    employee: UserBrief;
  } | null>(null);

  // Add Employee Form State
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [createdEmployeeInfo, setCreatedEmployeeInfo] = useState<{
    loginId: string;
    temporaryPassword?: string;
    name: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const emps = await fetchAllProfiles();
      const atts = await fetchAttendance();
      const lvs = await fetchLeaves();
      setEmployees(emps);
      setTodayAttendance(atts);
      setTodayLeaves(lvs);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
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
    if (sess.role === "EMPLOYEE") {
      router.push(`/profile?id=${sess.id}`);
      return;
    }
    setCurrentUser(sess);
    loadData();

    // Close context menu on outside click
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);

    // Listen to checkin/checkout updates from header to refresh status dots
    window.addEventListener("attendanceUpdate", loadData);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("attendanceUpdate", loadData);
    };
  }, [router]);

  const handleCreateEmployee = async (formData: Record<string, string>) => {
    if (!currentUser) return;
    try {
      const result = await createEmployee({
        hrUserId: currentUser.id,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile || undefined,
        department: formData.department || undefined,
        title: formData.title || undefined,
        basicSalary: parseFloat(formData.basicSalary) || undefined,
        role: formData.role || "EMPLOYEE"
      });

      setIsAddingEmployee(false);
      setCreatedEmployeeInfo({
        loginId: result.employee.employeeId,
        temporaryPassword: result.temporaryPassword,
        name: result.employee.name
      });

      // Reload Directory
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateProfile(userId, { role: newRole });
      setContextMenu(null);
      await loadData();
      alert(`Role successfully updated to ${newRole}!`);
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent, emp: UserBrief) => {
    if (currentUser?.role !== "ADMIN") return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      employee: emp
    });
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading Directory...
      </div>
    );
  }

  const isHr = currentUser.role === "HR" || currentUser.role === "ADMIN";
  const isAdmin = currentUser.role === "ADMIN";

  // Counts for role separation
  const staffMembers = employees.filter((e) => e.role === "EMPLOYEE");
  const hrMembers = employees.filter((e) => e.role === "HR");
  const adminMembers = employees.filter((e) => e.role === "ADMIN");

  // Filter employees by roleTab and search query
  const filteredEmployees = employees.filter((emp) => {
    if (roleTab !== "ALL" && emp.role !== roleTab) return false;
    
    // HR only view (non-admin) hides system admins
    if (currentUser.role === "HR" && emp.role === "ADMIN") return false;
    
    if (!searchQuery) return true;
    return (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.title && emp.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Helper to determine status dot of each employee
  const getEmployeeStatus = (empId: string) => {
    const todayStr = new Date().toDateString();

    // 1. Check if they have an active checked-in attendance today
    const checkedInToday = todayAttendance.some(
      (a) =>
        a.userId === empId &&
        new Date(a.date).toDateString() === todayStr &&
        a.status === "PRESENT" &&
        !a.checkOut
    );
    if (checkedInToday) return "PRESENT";

    // 2. Check if they are on an approved leave today
    const onLeaveToday = todayLeaves.some(
      (l) =>
        l.userId === empId &&
        l.status === "APPROVED" &&
        new Date(l.startDate) <= new Date() &&
        new Date(l.endDate) >= new Date()
    );
    if (onLeaveToday) return "LEAVE";

    // Otherwise they are absent (yellow dot)
    return "ABSENT";
  };

  const renderEmployeeCard = (emp: UserBrief) => {
    const status = getEmployeeStatus(emp.id);
    const initials = emp.name
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const isEmpHr = emp.role === "HR";
    const isEmpAdmin = emp.role === "ADMIN";

    return (
      <div
        key={emp.id}
        className="glass-card employee-card animate-in"
        onClick={() => router.push(`/profile?id=${emp.id}`)}
        onContextMenu={(e) => handleCardContextMenu(e, emp)}
        style={{
          cursor: "pointer",
          position: "relative",
          transition: "transform 0.2s, box-shadow 0.2s",
          border: isEmpHr ? "1px solid rgba(245, 158, 11, 0.4)" : isEmpAdmin ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid var(--border-primary)"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "var(--shadow-glow)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Role Badge & Status Dot */}
        <div style={{ position: "absolute", top: "14px", left: "14px", display: "flex", gap: "6px" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: 700,
              background: isEmpAdmin ? "rgba(244, 63, 94, 0.2)" : isEmpHr ? "rgba(245, 158, 11, 0.2)" : "rgba(56, 189, 248, 0.2)",
              color: isEmpAdmin ? "#f43f5e" : isEmpHr ? "#fbbf24" : "#38bdf8",
              border: `1px solid ${isEmpAdmin ? "#f43f5e" : isEmpHr ? "#fbbf24" : "#38bdf8"}`
            }}
          >
            {isEmpAdmin ? "ADMIN" : isEmpHr ? "HR MANAGER" : "STAFF"}
          </span>
        </div>

        {/* Attendance Status Dot top-right corner */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            background:
              status === "PRESENT"
                ? "var(--success)"
                : status === "LEAVE"
                ? "#3b82f6" // Blue
                : "#eab308" // Yellow
          }}
          title={
            status === "PRESENT"
              ? "Present"
              : status === "LEAVE"
              ? "On Leave"
              : "Absent"
          }
        >
          {status === "LEAVE" ? "✈️" : ""}
        </div>

        <div
          className="glass-card__body"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "var(--space-6) var(--space-4) var(--space-4) var(--space-4)"
          }}
        >
          {/* Initials Avatar */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: isEmpHr
                ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)"
                : isEmpAdmin
                ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
                : "var(--accent-gradient)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "var(--font-lg)",
              margin: "var(--space-2) 0 var(--space-3) 0",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            {initials}
          </div>

          <h3 style={{ margin: 0, fontSize: "var(--font-md)" }}>{emp.name}</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", margin: "4px 0 0 0" }}>
            {emp.title || (isEmpHr ? "HR Manager" : "Employee")}
          </p>
          <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-xs)", margin: "2px 0 0 0" }}>
            {emp.department || "No Department"}
          </p>

          {/* Admin Role Toggle Button */}
          {isAdmin && (
            <div style={{ marginTop: "var(--space-3)", width: "100%" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleChange(emp.id, emp.role === "HR" ? "EMPLOYEE" : "HR");
                }}
                className="btn-ghost"
                style={{
                  width: "100%",
                  fontSize: "11px",
                  padding: "4px 8px",
                  color: emp.role === "HR" ? "var(--text-secondary)" : "#c084fc",
                  borderColor: emp.role === "HR" ? "var(--border-primary)" : "rgba(168, 85, 247, 0.4)",
                  background: emp.role === "HR" ? "rgba(255,255,255,0.02)" : "rgba(168, 85, 247, 0.1)"
                }}
              >
                {emp.role === "HR" ? "⇄ Switch to Staff" : "👑 Grant HR Role"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Role Separation Category Tabs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              onClick={() => setRoleTab("ALL")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                background: roleTab === "ALL" ? "var(--bg-glass-hover)" : "none",
                border: "none",
                borderBottom: roleTab === "ALL" ? "2px solid var(--text-accent)" : "2px solid transparent",
                color: roleTab === "ALL" ? "var(--text-accent)" : "var(--text-secondary)",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)"
              }}
              id="tab-role-all"
            >
              All Members ({employees.length})
            </button>
            <button
              onClick={() => setRoleTab("EMPLOYEE")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                background: roleTab === "EMPLOYEE" ? "var(--bg-glass-hover)" : "none",
                border: "none",
                borderBottom: roleTab === "EMPLOYEE" ? "2px solid #38bdf8" : "2px solid transparent",
                color: roleTab === "EMPLOYEE" ? "#38bdf8" : "var(--text-secondary)",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)"
              }}
              id="tab-role-staff"
            >
              👤 Staff Members ({staffMembers.length})
            </button>
            <button
              onClick={() => setRoleTab("HR")}
              style={{
                padding: "var(--space-2) var(--space-4)",
                background: roleTab === "HR" ? "var(--bg-glass-hover)" : "none",
                border: "none",
                borderBottom: roleTab === "HR" ? "2px solid #fbbf24" : "2px solid transparent",
                color: roleTab === "HR" ? "#fbbf24" : "var(--text-secondary)",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)"
              }}
              id="tab-role-hr"
            >
              👑 HR Officers ({hrMembers.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => setRoleTab("ADMIN")}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  background: roleTab === "ADMIN" ? "var(--bg-glass-hover)" : "none",
                  border: "none",
                  borderBottom: roleTab === "ADMIN" ? "2px solid #f43f5e" : "2px solid transparent",
                  color: roleTab === "ADMIN" ? "#f43f5e" : "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)"
                }}
                id="tab-role-admin"
              >
                🛡️ Admins ({adminMembers.length})
              </button>
            )}
          </div>

          {isAdmin && (
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              💡 Admin Tip: Right-click any staff card to grant HR access
            </span>
          )}
        </div>

        {/* Directory Controls */}
        <div
          className="glass-card animate-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "var(--space-4) var(--space-6)",
            marginBottom: "var(--space-6)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flex: 1 }}>
            {isHr && (
              <button
                onClick={() => setIsAddingEmployee(true)}
                className="btn-primary"
                style={{ whiteSpace: "nowrap" }}
                id="hr-add-employee-btn"
              >
                {isAdmin ? "+ Add User" : "NEW"}
              </button>
            )}
            <input
              type="text"
              placeholder="Search by employee name, job title, or department..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: "480px" }}
              id="directory-search-input"
            />
          </div>
          <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>

        {/* Employees Grid */}
        {roleTab === "ALL" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* HR Managers Section */}
            {hrMembers.length > 0 && (
              <div>
                <h3 style={{ color: "#f43f5e", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  👑 HR Officers & Managers ({hrMembers.length})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-6)" }}>
                  {hrMembers.map(renderEmployeeCard)}
                </div>
              </div>
            )}

            {/* Staff Members Section */}
            {staffMembers.length > 0 && (
              <div>
                <h3 style={{ color: "#e2e8f0", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  👤 Staff Members ({staffMembers.length})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-6)" }}>
                  {staffMembers.map(renderEmployeeCard)}
                </div>
              </div>
            )}

            {/* Admin Section if Admin */}
            {isAdmin && adminMembers.length > 0 && (
              <div>
                <h3 style={{ color: "#eab308", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  🛡️ System Administrators ({adminMembers.length})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-6)" }}>
                  {adminMembers.map(renderEmployeeCard)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "var(--space-6)"
            }}
            id="employees-grid"
          >
            {filteredEmployees.map(renderEmployeeCard)}
          </div>
        )}

        {filteredEmployees.length === 0 && (
          <div className="empty-state" style={{ marginTop: "var(--space-8)" }}>
            No users found matching the search criteria.
          </div>
        )}
      </main>

      {/* Floating Right-Click Context Menu for Admin */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 999,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            padding: "8px 0",
            minWidth: "200px"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "6px 16px", fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 700, borderBottom: "1px solid var(--border-primary)", textTransform: "uppercase" }}>
            {contextMenu.employee.name} ({contextMenu.employee.role})
          </div>

          <button
            onClick={() => handleRoleChange(contextMenu.employee.id, "HR")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 16px",
              background: "none",
              border: "none",
              color: "#c084fc",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            👑 Grant HR Role
          </button>

          <button
            onClick={() => handleRoleChange(contextMenu.employee.id, "EMPLOYEE")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 16px",
              background: "none",
              border: "none",
              color: "#4ade80",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(52, 211, 153, 0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            👤 Set as Staff Member
          </button>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-primary)", margin: "4px 0" }} />

          <button
            onClick={() => {
              setContextMenu(null);
              router.push(`/profile?id=${contextMenu.employee.id}`);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 16px",
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "13px",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            👁️ View Profile
          </button>
        </div>
      )}

      {/* HR / Admin Add User Modal matching Register Page Styling */}
      {isAddingEmployee && (
        <AddUserModal
          onClose={() => setIsAddingEmployee(false)}
          onSuccess={(info) => {
            setCreatedEmployeeInfo(info);
            loadData();
          }}
          currentUserId={currentUser.id}
          defaultCompany={currentUser.company || "Dayflow Technologies"}
          isAdmin={isAdmin}
        />
      )}

      {/* Success Block Modal showing generated credentials */}
      {createdEmployeeInfo && (
        <div className="modal-overlay" onClick={() => setCreatedEmployeeInfo(null)}>
          <div className="modal" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: "var(--success)" }}>🎉 Employee Registered!</h3>
              <button className="modal__close" onClick={() => setCreatedEmployeeInfo(null)}>×</button>
            </div>
            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
                The new employee profile has been created successfully. Share these login credentials for their first sign-in:
              </p>
              
              <div style={{ padding: "var(--space-4)", background: "var(--bg-glass)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div>
                  <strong>Employee:</strong> {createdEmployeeInfo.name}
                </div>
                <div>
                  <strong>Login ID:</strong> <code style={{ color: "var(--text-accent)", fontSize: "var(--font-md)", fontWeight: 700 }}>{createdEmployeeInfo.loginId}</code>
                </div>
                <div>
                  <strong>Temporary Password:</strong> <code style={{ color: "var(--warning)", fontSize: "var(--font-md)", fontWeight: 700 }}>{createdEmployeeInfo.temporaryPassword}</code>
                </div>
              </div>

              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                💡 Note: They can sign in using either this generated Login ID or their email, and will be able to change their password once logged in.
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn-primary" onClick={() => setCreatedEmployeeInfo(null)}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
