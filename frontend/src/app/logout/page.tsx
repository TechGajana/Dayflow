"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear user session from local storage
    localStorage.removeItem("dayflow_user");
    
    // Auto redirect to login page after 2 seconds
    const timer = setTimeout(() => {
      router.push("/login?loggedOut=true");
    }, 1800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "var(--bg-primary)"
      }}
    >
      <div
        className="glass-card animate-in"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "var(--space-8)",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "var(--space-4)" }}>
          🔒
        </div>

        <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 800, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
          Logged Out Successfully
        </h1>

        <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-6)" }}>
          Your session has been terminated safely. Redirecting you to the login page...
        </p>

        <button
          onClick={() => router.push("/login?loggedOut=true")}
          className="btn-primary"
          style={{ width: "100%" }}
        >
          Sign Back In Now
        </button>
      </div>
    </div>
  );
}
