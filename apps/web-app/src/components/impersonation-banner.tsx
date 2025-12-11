"use client";

import { useEffect, useState } from "react";
import { stopImpersonation } from "@repo/api-client";
import { colors, spacing } from "../styles/design-system";

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [userName, setUserName] = useState("");
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    // Check for impersonation token
    const impersonationToken = localStorage.getItem("impersonationToken");
    if (impersonationToken) {
      // Decode token to get user info (basic check)
      try {
        const payload = JSON.parse(atob(impersonationToken.split(".")[1]));
        setIsImpersonating(payload.isImpersonating === true);
        // We'll get user/tenant names from API or context
        // For now, just show banner if token exists
      } catch (e) {
        // Invalid token, clear it
        localStorage.removeItem("impersonationToken");
      }
    }
  }, []);

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
      setIsImpersonating(false);
      // Reload page to clear impersonation context
      window.location.reload();
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
      // Still clear token and reload
      localStorage.removeItem("impersonationToken");
      window.location.reload();
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: colors.warning || "#f59e0b",
        color: colors.white || "#ffffff",
        padding: spacing.md,
        textAlign: "center",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        Şu anda {userName || "bir kullanıcı"} kullanıcısı olarak{" "}
        {tenantName || "bir kiracı"} kiracısında oturum açtınız.
      </span>
      <button
        onClick={handleStopImpersonation}
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          color: colors.white || "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          padding: `${spacing.xs} ${spacing.md}`,
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
        }}
      >
        Çık ve kendi hesabıma dön
      </button>
    </div>
  );
}



