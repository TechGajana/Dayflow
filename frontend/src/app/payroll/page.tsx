"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchProfile, updateProfile, User } from "@/lib/api";
import EditModal from "@/components/EditModal";

function PayrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("dayflow_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const sess = JSON.parse(storedUser);
    setCurrentUser(sess);

    const targetId = userId || sess.id;

    const loadProfile = async () => {
      try {
        const prof = await fetchProfile(targetId);
        setProfileUser(prof);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, userId]);

  const handleSaveSalary = async (formData: Record<string, string>) => {
    if (!profileUser) return;
    try {
      await updateProfile(profileUser.id, {
        basicSalary: parseFloat(formData.basicSalary) || 0.0,
        allowance: parseFloat(formData.allowance) || 0.0,
        deductions: parseFloat(formData.deductions) || 0.0
      });
      setIsEditing(false);
      // Reload profile
      const prof = await fetchProfile(profileUser.id);
      setProfileUser(prof);
    } catch (err) {
      alert("Failed to update salary details");
    }
  };

  if (loading || !currentUser || !profileUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading payroll...
      </div>
    );
  }

  const basic = profileUser.basicSalary || 0.0;
  const allowance = profileUser.allowance || 0.0;
  const deductions = profileUser.deductions || 0.0;
  const netPay = basic + allowance - deductions;

  const isHr = currentUser.role === "HR";

  return (
    <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
      <Sidebar />

      <div style={{ flex: 1 }}>
        <header className="page-header animate-in" style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1>Salary Structure & Payslip</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginTop: "4px" }}>
              Payroll registry for {profileUser.name} ({profileUser.employeeId})
            </p>
          </div>
          {isHr && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary"
              id="edit-salary-btn"
            >
              ⚙️ Modify Salary Details
            </button>
          )}
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)", alignItems: "start" }}>
          {/* Detailed Salary Card */}
          <div className="glass-card animate-in animate-in-delay-1" id="salary-breakdown-card">
            <div className="glass-card__header">
              <h2>Salary Structure</h2>
              {isHr && <span className="status-badge">Admin Controls</span>}
            </div>

            <div className="glass-card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Basic Salary:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>${basic.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Allowances:</span>
                <span style={{ fontWeight: 600, color: "var(--success)" }}>+${allowance.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Deductions:</span>
                <span style={{ fontWeight: 600, color: "var(--danger)" }}>-${deductions.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "var(--space-2)", fontSize: "var(--font-lg)" }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Estimated Net Salary:</span>
                <span style={{ fontWeight: 800, color: "var(--text-accent)" }}>${netPay.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Rendered Payslip Card */}
          <div className="glass-card animate-in animate-in-delay-2" id="payslip-card">
            <div className="glass-card__header">
              <h2>Generated Payslip Slip</h2>
              <button
                className="btn-ghost"
                onClick={() => window.print()}
                style={{ fontSize: "var(--font-xs)", padding: "var(--space-1) var(--space-3)" }}
              >
                🖨️ Print Slip
              </button>
            </div>
            <div className="glass-card__body" style={{ background: "rgba(255,255,255,0.01)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-primary)", fontFamily: "monospace", fontSize: "var(--font-xs)", lineHeight: 1.6 }}>
              <div style={{ textAlign: "center", borderBottom: "1px dashed var(--border-primary)", paddingBottom: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>DAYFLOW TECHNOLOGIES INC.</div>
                <div>Monthly Pay Advice</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                <div>Employee Name: {profileUser.name}</div>
                <div>ID: {profileUser.employeeId}</div>
                <div>Department: {profileUser.department || "—"}</div>
                <div>Designation: {profileUser.title || "—"}</div>
                <div>Location: {profileUser.location || "—"}</div>
                <div>Date: {new Date().toLocaleDateString([], { month: "long", year: "numeric" })}</div>
              </div>

              <div style={{ borderTop: "1px dashed var(--border-primary)", borderBottom: "1px dashed var(--border-primary)", padding: "var(--space-2) 0", marginBottom: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>ITEM DESCRIPTION</span>
                  <span>AMOUNT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-1)" }}>
                  <span>Basic Base Pay</span>
                  <span>${basic.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Allowance Package</span>
                  <span>${allowance.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Provident / Tax Deductions</span>
                  <span>-${deductions.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "var(--font-sm)" }}>
                <span>TOTAL DISBURSEMENT (NET)</span>
                <span>${netPay.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <EditModal
          title="Update Salary Details"
          onClose={() => setIsEditing(false)}
          onSave={handleSaveSalary}
          fields={[
            {
              key: "basicSalary",
              label: "Basic Salary ($)",
              value: basic.toString(),
              type: "text"
            },
            {
              key: "allowance",
              label: "Allowance ($)",
              value: allowance.toString(),
              type: "text"
            },
            {
              key: "deductions",
              label: "Deductions ($)",
              value: deductions.toString(),
              type: "text"
            }
          ]}
        />
      )}
    </div>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading payroll advice...
      </div>
    }>
      <PayrollContent />
    </Suspense>
  );
}
