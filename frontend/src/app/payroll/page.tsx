"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
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
        console.error("Failed to load profile for payroll:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, userId]);

  const handleSaveSalary = async (formData: Record<string, string>) => {
    if (!profileUser) return;
    try {
      const updated = await updateProfile(profileUser.id, {
        monthWage: parseFloat(formData.monthWage) || 0.0
      });
      setIsEditing(false);
      setProfileUser({ ...profileUser, ...updated });
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

  // Calculate Salary Components
  const monthWage = profileUser.monthWage || 0.0;
  const basic = monthWage * 0.50; // 50%
  const hra = basic * 0.50; // 50% of basic
  const standardAllowance = basic * 0.1667; // 16.67% of basic
  const performanceBonus = basic * 0.0833; // 8.33% of basic
  const lta = basic * 0.0833; // 8.33% of basic
  const fixedAllowance = monthWage - (basic + hra + standardAllowance + performanceBonus + lta);
  
  const allowance = hra + standardAllowance + performanceBonus + lta + fixedAllowance;
  const deductions = basic * 0.12 + 200.00; // Employee PF + Professional Tax
  const netPay = monthWage - deductions;

  const isHr = currentUser.role === "HR";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        <header className="page-header animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Salary Structure & Payslip</h1>
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
                <span style={{ color: "var(--text-secondary)" }}>Basic Salary (50%):</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>${basic.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>HRA & Allowances:</span>
                <span style={{ fontWeight: 600, color: "var(--success)" }}>+${allowance.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)", paddingBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Deductions (PF & Tax):</span>
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
                🖨️ Print
              </button>
            </div>

            <div className="glass-card__body" style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  fontFamily: "monospace",
                  background: "rgba(0, 0, 0, 0.2)",
                  padding: "var(--space-6)",
                  border: "1px dashed var(--border-primary)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  lineHeight: "1.6"
                }}
              >
                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", marginBottom: "var(--space-4)" }}>
                  DAYFLOW HR SYSTEMS INC.
                  <br />
                  SALARY DISBURSEMENT ADVICE
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "var(--space-4)", borderBottom: "1px solid var(--border-primary)", paddingBottom: "10px" }}>
                  <div>
                    <strong>EMPLOYEE ID:</strong> {profileUser.employeeId}
                    <br />
                    <strong>NAME:</strong> {profileUser.name}
                    <br />
                    <strong>DESIGNATION:</strong> {profileUser.title || "Staff"}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>ADVICE NO:</strong> DF-{profileUser.employeeId}-{new Date().getFullYear()}
                    <br />
                    <strong>DATE:</strong> {new Date().toLocaleDateString()}
                    <br />
                    <strong>COMPANY:</strong> {profileUser.company || "Dayflow"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) BASIC WAGE:</span>
                    <span>${basic.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) HRA (50.00% of basic):</span>
                    <span>${hra.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) STANDARD ALLOWANCE:</span>
                    <span>${standardAllowance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) PERFORMANCE BONUS:</span>
                    <span>${performanceBonus.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) LEAVE TRAVEL ALLOWANCE:</span>
                    <span>${lta.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) FIXED ALLOWANCE:</span>
                    <span>${fixedAllowance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-primary)", paddingTop: "4px" }}>
                    <strong>GROSS SALARY:</strong>
                    <strong>${monthWage.toFixed(2)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(-) PROVIDENT FUND (12% of basic):</span>
                    <span>${(basic * 0.12).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(-) PROFESSIONAL TAX:</span>
                    <span>$200.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-primary)", paddingTop: "4px" }}>
                    <strong>TOTAL DEDUCTIONS:</strong>
                    <strong>${deductions.toFixed(2)}</strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    fontWeight: "bold",
                    borderTop: "2px solid var(--border-primary)",
                    paddingTop: "10px",
                    marginTop: "10px"
                  }}
                >
                  <span>NET PAYABLE DISBURSEMENT:</span>
                  <span style={{ color: "var(--text-accent)" }}>${netPay.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {isEditing && (
        <EditModal
          title="Modify Salary Details"
          onClose={() => setIsEditing(false)}
          onSave={handleSaveSalary}
          fields={[
            { label: "Month Wage ($)", key: "monthWage", value: monthWage.toString(), type: "text" }
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
        Loading payroll...
      </div>
    }>
      <PayrollContent />
    </Suspense>
  );
}
