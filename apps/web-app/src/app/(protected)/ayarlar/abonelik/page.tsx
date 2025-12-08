"use client";

import { useEffect, useState } from "react";
import { getSubscription, getUsage } from "@repo/api-client";
import type { SubscriptionResponse, UsageResponse } from "@repo/api-client";
import { billing as billingTranslations } from "@repo/i18n";

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [subData, usageData, userData] = await Promise.all([
          getSubscription(),
          getUsage(),
          import("@repo/api-client").then((m) => m.getCurrentUser()),
        ]);

        setSubscription(subData.data);
        setUsage(usageData.data);
        
        const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
        setUserRole(currentTenant?.role || null);
      } catch (err: any) {
        setError(err.message || "Veri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "FREE":
        return billingTranslations.subscription.planFree;
      case "PRO":
        return billingTranslations.subscription.planPro;
      case "ENTERPRISE":
        return billingTranslations.subscription.planEnterprise;
      default:
        return plan;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return billingTranslations.subscription.statusActive;
      case "PAST_DUE":
        return billingTranslations.subscription.statusPastDue;
      case "CANCELLED":
        return billingTranslations.subscription.statusCancelled;
      default:
        return status;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return "#ef4444"; // red
    if (percentage >= 70) return "#f59e0b"; // yellow
    return "#10b981"; // green
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  const isStaffOrReadOnly = userRole === "Staff" || userRole === "ReadOnly";

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "2rem" }}>
        {billingTranslations.title}
      </h1>

      {/* Subscription Section */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>
          {billingTranslations.subscription.title}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              {billingTranslations.subscription.currentPlan}
            </p>
            <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>
              {subscription ? getPlanName(subscription.plan) : "-"}
            </p>
          </div>

          <div>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              {billingTranslations.subscription.status}
            </p>
            <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>
              {subscription ? getStatusName(subscription.status) : "-"}
            </p>
          </div>

          {subscription?.trial_until && (
            <div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                {billingTranslations.subscription.trialUntil}
              </p>
              <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>
                {new Date(subscription.trial_until).toLocaleDateString("tr-TR")}
              </p>
            </div>
          )}

          {subscription?.valid_until && (
            <div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                {billingTranslations.subscription.validUntil}
              </p>
              <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>
                {new Date(subscription.valid_until).toLocaleDateString("tr-TR")}
              </p>
            </div>
          )}
        </div>

        {(subscription?.plan === "FREE" || subscription?.plan === "PRO") && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
            <p style={{ fontSize: "0.875rem", color: "#374151" }}>
              {billingTranslations.subscription.upgradeHint}
            </p>
          </div>
        )}

        {!isStaffOrReadOnly && (
          <button
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "not-allowed",
              opacity: 0.6,
            }}
            disabled
          >
            {billingTranslations.subscription.upgradeButton}
          </button>
        )}

        {isStaffOrReadOnly && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#fef3c7", borderRadius: "4px" }}>
            <p style={{ fontSize: "0.875rem", color: "#92400e" }}>
              {billingTranslations.hints.staffReadOnly}
            </p>
          </div>
        )}
      </div>

      {/* Usage Section */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>
          {billingTranslations.usage.title}
        </h2>

        {!usage ? (
          <p style={{ color: "#6b7280" }}>{billingTranslations.usage.noData}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { key: "clientCompanies", label: billingTranslations.usage.clientCompanies },
              { key: "documents", label: billingTranslations.usage.documents },
              { key: "aiAnalyses", label: billingTranslations.usage.aiAnalyses },
              { key: "users", label: billingTranslations.usage.users },
              { key: "scheduledReports", label: billingTranslations.usage.scheduledReports },
            ].map(({ key, label }) => {
              const metric = usage[key as keyof UsageResponse] as { used: number; limit: number; remaining: number };
              const percentage = getUsagePercentage(metric.used, metric.limit);
              const color = getUsageColor(percentage);

              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "500" }}>{label}</span>
                    <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                      {metric.used} / {metric.limit}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        backgroundColor: color,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    {billingTranslations.usage.remaining}: {metric.remaining}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

