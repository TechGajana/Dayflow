"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import EditModal from "@/components/EditModal";
import {
  fetchAllProfiles,
  fetchAttendance,
  fetchLeaves,
  createEmployee,
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

    // Listen to checkin/checkout updates from header to refresh status dots
    window.addEventListener("attendanceUpdate", loadData);
    return () => window.removeEventListener("attendanceUpdate", loadData);
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
        basicSalary: parseFloat(formData.basicSalary) || undefined
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
      alert(err.message || "Failed to create employee");
    }
  };

  if (loading || !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading Directory...
      </div>
    );
  }

  const isHr = currentUser.role === "HR";

  // Filter employees by search query & role permissions
  const filteredEmployees = employees.filter((emp) => {
    // 1. HR can only see/manage EMPLOYEE users
    if (currentUser.role === "HR" && emp.role !== "EMPLOYEE") return false;
    
    // 2. Regular employees (Staff) can see other Staff and HR managers, but NOT system Admins
    if (currentUser.role === "EMPLOYEE" && emp.role === "ADMIN") return false;
    
    // 3. Admin can see everyone
    
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
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
                NEW
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "var(--space-6)"
          }}
          id="employees-grid"
        >
          {filteredEmployees.map((emp) => {
            const status = getEmployeeStatus(emp.id);
            const initials = emp.name
              .split(/\s+/)
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={emp.id}
                className="glass-card employee-card animate-in"
                onClick={() => router.push(`/profile?id=${emp.id}`)}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Status Dot top-right corner */}
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
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
                    padding: "var(--space-6)"
                  }}
                >
                  {/* Initials Avatar */}
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "var(--accent-gradient)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "var(--font-lg)",
                      marginBottom: "var(--space-4)",
                      boxShadow: "var(--shadow-sm)"
                    }}
                  >
                    {initials}
                  </div>

                  <h3 style={{ margin: 0, fontSize: "var(--font-md)" }}>{emp.name}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", margin: "4px 0 0 0" }}>
                    {emp.title || "Employee"}
                  </p>
                  <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-xs)", margin: "2px 0 0 0" }}>
                    {emp.department || "No Department"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="empty-state" style={{ marginTop: "var(--space-8)" }}>
            No employees found matching the search criteria.
          </div>
        )}
      </main>

      {/* HR Add Employee Modal */}
      {isAddingEmployee && (
        <EditModal
          title="Add New Employee"
          onClose={() => setIsAddingEmployee(false)}
          onSave={handleCreateEmployee}
          fields={[
            { key: "name", label: "Full Name", value: "", type: "text" },
            { key: "email", label: "Email Address", value: "", type: "text" },
            { key: "mobile", label: "Phone / Mobile", value: "", type: "text" },
            { key: "department", label: "Department", value: "", type: "text" },
            { key: "title", label: "Job Title / Designation", value: "", type: "text" },
            { key: "basicSalary", label: "Month Wage ($)", value: "50000", type: "text" }
          ]}
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
