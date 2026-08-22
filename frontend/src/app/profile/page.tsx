import { fetchProfile } from "@/lib/api";
import ProfileHeader from "@/components/ProfileHeader";
import TabNavigation from "@/components/TabNavigation";
import ContentSection from "@/components/ContentSection";
import SkillsCard from "@/components/SkillsCard";
import CertificationCard from "@/components/CertificationCard";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "My Profile — Dayflow",
  description: "View and manage your employee profile, skills, and certifications.",
};

// Force dynamic rendering so it fetches from API on load
export const dynamic = "force-dynamic";

interface ProfileProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfileProps) {
  let user = null;
  let apiError = false;

  const resolvedParams = await searchParams;
  const targetId = resolvedParams.id;

  try {
    user = await fetchProfile(targetId);
  } catch (error) {
    console.error("Failed to fetch profile from backend API:", error);
    apiError = true;
  }

  if (apiError || !user) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <h1>My Profile</h1>
        </div>
        <div className="glass-card">
          <div className="glass-card__body">
            <div className="empty-state">
              <div className="empty-state__icon">⚠️</div>
              <h3 style={{ marginBottom: "8px", fontWeight: 600 }}>
                {apiError ? "Backend Server Connection Failed" : "No Profile Data"}
              </h3>
              <p className="empty-state__text">
                {apiError
                  ? "Ensure the backend server is running on http://localhost:5000 and the PostgreSQL database container is active."
                  : "The backend connected, but no user profile was found. Please seed the database."}
              </p>
              <div
                className="empty-state__text"
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "6px",
                  display: "inline-block",
                  textAlign: "left"
                }}
              >
                <strong>Setup Steps:</strong>
                <ol style={{ margin: "8px 0 0 16px" }}>
                  <li>Start database: <code>docker compose up -d</code></li>
                  <li>Go to backend: <code>cd backend</code></li>
                  <li>Migrate: <code>npx prisma migrate dev</code></li>
                  <li>Seed: <code>npm run prisma:seed</code></li>
                  <li>Start backend: <code>npm run dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "resume", label: "Resume" },
    { id: "private", label: "Private Info" },
  ];

  return (
    <div style={{ display: "flex", gap: "var(--space-8)", padding: "var(--space-8)", maxWidth: "1400px", margin: "0 auto" }}>
      <Sidebar />

      <div style={{ flex: 1 }}>
        {/* Page Header */}
        <header className="page-header animate-in" id="page-header">
          <h1>Employee Profile</h1>
          <div className="page-header__actions">
            <div className="status-badge">
              <span className="status-badge__dot" />
              Active
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="profile-layout">
          {/* Left Column — Profile + Content */}
          <div>
            <div className="glass-card animate-in animate-in-delay-1" id="profile-card">
              {/* Profile Header */}
              <ProfileHeader user={user} />

              {/* Tab Navigation */}
              <TabNavigation tabs={tabs} defaultTab="resume">
                {/* Resume Tab Content */}
                <div>
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

                {/* Private Info Tab Content */}
                <div>
                  <div className="content-section">
                    <div className="content-section__header">
                      <h3 className="content-section__title">
                        <span className="section-icon">🔒</span>
                        Private Information
                      </h3>
                    </div>
                    <div className="content-section__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <div>
                        <strong>Employee ID:</strong> {user.employeeId}
                      </div>
                      <div>
                        <strong>Title / Designation:</strong> {user.title || "—"}
                      </div>
                      <div>
                        <strong>Role Permission:</strong> {user.role}
                      </div>
                      <div>
                        <strong>Join Date:</strong> {new Date(user.joinDate).toLocaleDateString([], { timeZone: "UTC" })}
                      </div>
                      <div>
                        <strong>Residential Address:</strong> {user.address || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </TabNavigation>
            </div>
          </div>

          {/* Right Column — Sidebar */}
          <aside className="sidebar-stack">
            <SkillsCard userId={user.id} skills={user.skills} />
            <CertificationCard userId={user.id} certifications={user.certifications} />
          </aside>
        </div>
      </div>
    </div>
  );
}
