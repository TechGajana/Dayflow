"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ProfileHeader from "@/components/ProfileHeader";
import ContentSection from "@/components/ContentSection";
import SkillsCard from "@/components/SkillsCard";
import CertificationCard from "@/components/CertificationCard";
import { fetchProfile, updateProfile, changePassword, User } from "@/lib/api";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("resume");

  // Private Info Form State
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [panNo, setPanNo] = useState("");
  const [uanNo, setUanNo] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [isSavingPrivate, setIsSavingPrivate] = useState(false);

  // Salary Info Form State
  const [monthWage, setMonthWage] = useState(0);
  const [workingDays, setWorkingDays] = useState(5);
  const [breakTime, setBreakTime] = useState(1);
  const [hrsPerDay, setHrsPerDay] = useState(8);
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  // Security Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const loadProfile = async () => {
    try {
      const storedUser = localStorage.getItem("dayflow_user");
      if (!storedUser) {
        router.push("/login");
        return;
      }
      const sess = JSON.parse(storedUser);
      setCurrentUser(sess);
      const profileId = targetId || sess.id;
      const data = await fetchProfile(profileId);
      if (!data) {
        setError("User profile not found");
        return;
      }
      setUser(data);

      // Initialize Private Info Form
      setDob(data.dob ? data.dob.split("T")[0] : "");
      setAddress(data.address || "");
      setNationality(data.nationality || "");
      setPersonalEmail(data.personalEmail || "");
      setGender(data.gender || "");
      setMaritalStatus(data.maritalStatus || "");
      setAccountNumber(data.accountNumber || "");
      setBankName(data.bankName || "");
      setIfscCode(data.ifscCode || "");
      setPanNo(data.panNo || "");
      setUanNo(data.uanNo || "");
      setEmpCode(data.empCode || data.employeeId);

      // Initialize Salary Info Form
      setMonthWage(data.monthWage || 0);
      setWorkingDays(data.workingDaysPerWeek || 5);
      setBreakTime(data.breakTime || 1);
      setHrsPerDay(data.hrsPerDay || 8);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetId, router]);

  const handleSavePrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPrivate(true);
    setError(null);
    try {
      const updated = await updateProfile(user.id, {
        dob: dob || undefined,
        address,
        nationality,
        personalEmail,
        gender,
        maritalStatus,
        accountNumber,
        bankName,
        ifscCode,
        panNo,
        uanNo,
        empCode
      });
      setUser({ ...user, ...updated });
      alert("Private information saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSavingPrivate(false);
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingSalary(true);
    setError(null);
    try {
      const updated = await updateProfile(user.id, {
        monthWage,
        workingDaysPerWeek: workingDays,
        breakTime,
        hrsPerDay
      });
      setUser({ ...user, ...updated });
      alert("Salary configuration updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update salary configuration");
    } finally {
      setIsSavingSalary(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match", isError: true });
      return;
    }
    setIsSavingPassword(true);
    setPasswordMessage(null);
    try {
      await changePassword({
        userId: user.id,
        oldPassword,
        newPassword
      });
      setPasswordMessage({ text: "Password changed successfully!", isError: false });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ text: err.message || "Failed to update password", isError: true });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading profile...
      </div>
    );
  }

  if (error || !user || !currentUser) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <h3>Error: {error || "User not found"}</h3>
        <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ marginTop: "16px" }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Calculate Salary Components dynamically
  const yearlyWage = monthWage * 12;
  const basic = monthWage * 0.50; // 50%
  const hra = basic * 0.50; // 50% of basic
  const standardAllowance = basic * 0.1667; // 16.67% of basic
  const performanceBonus = basic * 0.0833; // 8.33% of basic
  const lta = basic * 0.0833; // 8.33% of basic
  const fixedAllowance = monthWage - (basic + hra + standardAllowance + performanceBonus + lta);
  const employeePf = basic * 0.12; // 12% of basic
  const employerPf = basic * 0.12; // 12% of basic
  const professionalTax = 200.00;

  const isHr = currentUser.role === "HR";
  const isSelf = currentUser.id === user.id;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />

      <main style={{ padding: "0 var(--space-8) var(--space-8) var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Main Split Profile Layout */}
        <div className="profile-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--space-8)" }}>
          
          {/* Left Main Panels Area */}
          <div>
            <div className="glass-card animate-in animate-in-delay-1" id="profile-main-card">
              <ProfileHeader user={user} />

              {/* Tabs Buttons */}
              <div style={{ display: "flex", gap: "var(--space-2)", borderBottom: "1px solid var(--border-primary)", padding: "0 var(--space-6)", background: "rgba(255,255,255,0.01)" }}>
                <button
                  onClick={() => setActiveTab("resume")}
                  className={`tab-btn ${activeTab === "resume" ? "active" : ""}`}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === "resume" ? "2px solid var(--text-accent)" : "2px solid transparent",
                    color: activeTab === "resume" ? "var(--text-accent)" : "var(--text-secondary)",
                    fontWeight: activeTab === "resume" ? 600 : 500,
                    cursor: "pointer"
                  }}
                  id="tab-resume-btn"
                >
                  Resume
                </button>
                <button
                  onClick={() => setActiveTab("private")}
                  className={`tab-btn ${activeTab === "private" ? "active" : ""}`}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === "private" ? "2px solid var(--text-accent)" : "2px solid transparent",
                    color: activeTab === "private" ? "var(--text-accent)" : "var(--text-secondary)",
                    fontWeight: activeTab === "private" ? 600 : 500,
                    cursor: "pointer"
                  }}
                  id="tab-private-btn"
                >
                  Private Info
                </button>
                {isHr && (
                  <button
                    onClick={() => setActiveTab("salary")}
                    className={`tab-btn ${activeTab === "salary" ? "active" : ""}`}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === "salary" ? "2px solid var(--text-accent)" : "2px solid transparent",
                      color: activeTab === "salary" ? "var(--text-accent)" : "var(--text-secondary)",
                      fontWeight: activeTab === "salary" ? 600 : 500,
                      cursor: "pointer"
                    }}
                    id="tab-salary-btn"
                  >
                    Salary Info
                  </button>
                )}
                {isSelf && (
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === "security" ? "2px solid var(--text-accent)" : "2px solid transparent",
                      color: activeTab === "security" ? "var(--text-accent)" : "var(--text-secondary)",
                      fontWeight: activeTab === "security" ? 600 : 500,
                      cursor: "pointer"
                    }}
                    id="tab-security-btn"
                  >
                    Security
                  </button>
                )}
              </div>

              {/* Tab Contents */}
              <div style={{ padding: "var(--space-6)" }}>
                
                {/* 1. RESUME TAB */}
                {activeTab === "resume" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <ContentSection
                      userId={user.id}
                      title="About"
                      icon="✦"
                      content={user.about}
                      fieldKey="about"
                      animationDelay={0.1}
                    />
                    <ContentSection
                      userId={user.id}
                      title="What I love about my job"
                      icon="♥"
                      content={user.jobLove}
                      fieldKey="jobLove"
                      animationDelay={0.2}
                    />
                    <ContentSection
                      userId={user.id}
                      title="My interests and hobbies"
                      icon="✿"
                      content={user.hobbies}
                      fieldKey="hobbies"
                      animationDelay={0.3}
                    />
                  </div>
                )}

                {/* 2. PRIVATE INFO TAB */}
                {activeTab === "private" && (
                  <form onSubmit={handleSavePrivate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                      <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input type="date" className="form-input" value={dob} onChange={(e) => setDob(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nationality</label>
                        <input type="text" className="form-input" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Indian" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Personal Email</label>
                        <input type="email" className="form-input" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} placeholder="e.g. name@personal.com" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Residing Address</label>
                        <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Main St" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select className="form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Marital Status</label>
                        <select className="form-input" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date of Joining</label>
                        <input type="text" className="form-input" value={new Date(user.joinDate).toLocaleDateString()} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Employee Code / ID</label>
                        <input type="text" className="form-input" value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="e.g. OIJODO20220001" />
                      </div>
                    </div>

                    <h3 style={{ margin: "var(--space-4) 0 var(--space-2) 0", borderBottom: "1px solid var(--border-primary)", paddingBottom: "4px" }}>Bank Details</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input type="text" className="form-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Wells Fargo" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input type="text" className="form-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="987654321" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">IFSC Code</label>
                        <input type="text" className="form-input" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="WFGO0004567" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">PAN Number</label>
                        <input type="text" className="form-input" value={panNo} onChange={(e) => setPanNo(e.target.value)} placeholder="XYZWR9876K" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">UAN Number</label>
                        <input type="text" className="form-input" value={uanNo} onChange={(e) => setUanNo(e.target.value)} placeholder="200987654321" />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ alignSelf: "flex-end", marginTop: "var(--space-4)" }} disabled={isSavingPrivate}>
                      {isSavingPrivate ? "Saving..." : "Save Private Info"}
                    </button>
                  </form>
                )}

                {/* 3. SALARY INFO TAB (HR ONLY) */}
                {activeTab === "salary" && isHr && (
                  <form onSubmit={handleSaveSalary} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                      <div className="form-group">
                        <label className="form-label">Month Wage ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={monthWage}
                          onChange={(e) => setMonthWage(parseFloat(e.target.value) || 0)}
                          id="month-wage-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Yearly Wage ($)</label>
                        <input type="text" className="form-input" value={yearlyWage.toFixed(2)} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">No of working days in a week</label>
                        <input type="number" className="form-input" value={workingDays} onChange={(e) => setWorkingDays(parseInt(e.target.value) || 5)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Break Time (Hours)</label>
                        <input type="number" step="0.1" className="form-input" value={breakTime} onChange={(e) => setBreakTime(parseFloat(e.target.value) || 1)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Hrs per day</label>
                        <input type="number" className="form-input" value={hrsPerDay} onChange={(e) => setHrsPerDay(parseFloat(e.target.value) || 8)} />
                      </div>
                    </div>

                    {/* Auto Calculated Salary Components */}
                    <div style={{ padding: "var(--space-4)", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)" }}>
                      <h4 style={{ margin: "0 0 var(--space-4) 0", borderBottom: "1px solid var(--border-primary)", paddingBottom: "6px" }}>Calculated Salary Components</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-sm)" }}>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Basic Salary</strong> (50.00% of wage)</td>
                            <td style={{ textAlign: "right" }}>${basic.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>House Rent Allowance (HRA)</strong> (50.00% of basic)</td>
                            <td style={{ textAlign: "right" }}>${hra.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Standard Allowance</strong> (16.67% of basic)</td>
                            <td style={{ textAlign: "right" }}>${standardAllowance.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Performance Bonus</strong> (8.33% of basic)</td>
                            <td style={{ textAlign: "right" }}>${performanceBonus.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Leave Travel Allowance (LTA)</strong> (8.33% of basic)</td>
                            <td style={{ textAlign: "right" }}>${lta.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Fixed Allowance</strong> (Remaining amount)</td>
                            <td style={{ textAlign: "right" }}>${fixedAllowance.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Employee PF Contribution</strong> (12% of basic)</td>
                            <td style={{ textAlign: "right" }}>${employeePf.toFixed(2)} / month</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px 0" }}><strong>Employer PF Contribution</strong> (12% of basic)</td>
                            <td style={{ textAlign: "right" }}>${employerPf.toFixed(2)} / month</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 0" }}><strong>Professional Tax</strong></td>
                            <td style={{ textAlign: "right" }}>${professionalTax.toFixed(2)} / month</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <button type="submit" className="btn-primary" style={{ alignSelf: "flex-end" }} disabled={isSavingSalary} id="salary-save-btn">
                      {isSavingSalary ? "Saving..." : "Save Salary Config"}
                    </button>
                  </form>
                )}

                {/* 4. SECURITY PASSWORD CHANGE TAB */}
                {activeTab === "security" && isSelf && (
                  <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "400px" }}>
                    <h3>Change Password</h3>
                    {passwordMessage && (
                      <div
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          background: passwordMessage.isError ? "rgba(248, 113, 113, 0.1)" : "rgba(52, 211, 153, 0.1)",
                          border: `1px solid ${passwordMessage.isError ? "rgba(248, 113, 113, 0.2)" : "rgba(52, 211, 153, 0.2)"}`,
                          color: passwordMessage.isError ? "var(--danger)" : "var(--success)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-sm)"
                        }}
                      >
                        {passwordMessage.text}
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        id="old-password-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        id="new-password-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        id="confirm-password-input"
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSavingPassword} id="password-save-btn">
                      {isSavingPassword ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                )}

              </div>
            </div>
          </div>

          {/* Right Aside Sidebar details */}
          <aside className="sidebar-stack" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <SkillsCard userId={user.id} skills={user.skills} />
            <CertificationCard userId={user.id} certifications={user.certifications} />
          </aside>

        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
        Loading profile...
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
