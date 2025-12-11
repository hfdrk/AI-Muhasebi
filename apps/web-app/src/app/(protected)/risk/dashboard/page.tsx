"use client";

import { useRiskDashboard } from "@/hooks/use-risk";
import Link from "next/link";
import RiskExplanationPanel from "@/components/risk-explanation-panel";

export default function RiskDashboardPage() {
  const { data, isLoading, error } = useRiskDashboard();

  if (isLoading) {
    return (
      <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}>
            Risk Panosu
          </h1>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Genel risk durumu ve istatistikler</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                padding: "24px",
                backgroundColor: "#f9fafb",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                minHeight: "120px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error instanceof Error && (
      error.message.includes("Yetkilendirme") ||
      error.message.includes("Authorization") ||
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    );

    const isTenantError = error instanceof Error && (
      error.message.includes("Kiracı bulunamadı") ||
      error.message.includes("tenant") ||
      error.message.includes("Tenant not found")
    );

    return (
      <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}>
            Risk Panosu
          </h1>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Genel risk durumu ve istatistikler</p>
        </div>
        <div
          style={{
            padding: "24px",
            backgroundColor: isAuthError ? "#fef3c7" : isTenantError ? "#dbeafe" : "#fee2e2",
            borderRadius: "12px",
            border: `1px solid ${isAuthError ? "#fcd34d" : isTenantError ? "#93c5fd" : "#fca5a5"}`,
            color: isAuthError ? "#92400e" : isTenantError ? "#1e40af" : "#991b1b",
          }}
        >
          <p style={{ fontWeight: "600", marginBottom: "8px", fontSize: "18px" }}>⚠️ Hata oluştu</p>
          <p style={{ fontSize: "14px", marginBottom: "12px" }}>
            {error instanceof Error ? error.message : "Risk verileri yüklenirken bir hata oluştu."}
          </p>
          {isTenantError && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Risk panosunu görüntülemek için önce bir şirket/ofis seçmeniz gerekiyor.
              </p>
              <Link
                href="/anasayfa"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          )}
          {isAuthError && !isTenantError && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Risk panosunu görüntülemek için giriş yapmanız gerekiyor.
              </p>
              <Link
                href="/auth/login"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Giriş Yap
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const dashboard = data?.data;

  if (!dashboard) {
    return (
      <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}>
            Risk Panosu
          </h1>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Genel risk durumu ve istatistikler</p>
        </div>
        <div
          style={{
            padding: "40px",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            border: "2px dashed #d1d5db",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Henüz risk verisi bulunmuyor.</p>
        </div>
      </div>
    );
  }

  const totalClients =
    dashboard.clientRiskDistribution.low +
    dashboard.clientRiskDistribution.medium +
    dashboard.clientRiskDistribution.high;

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}>
          Risk Panosu
        </h1>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>Genel risk durumu ve istatistikler</p>
      </div>

      {dashboard && (
        <>
          {/* Key Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            {/* High Risk Clients */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "0 0 0 100%",
                  opacity: 0.3,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  ⚠️
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Yüksek Riskli Müşteriler
                </div>
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#dc2626" }}>
                {dashboard.highRiskClientCount}
              </div>
            </div>

            {/* Critical Alerts */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "0 0 0 100%",
                  opacity: 0.3,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  🚨
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>Kritik Uyarılar</div>
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#dc2626" }}>
                {dashboard.openCriticalAlertsCount}
              </div>
            </div>

            {/* Total Documents */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#dbeafe",
                  borderRadius: "0 0 0 100%",
                  opacity: 0.3,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#dbeafe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  📄
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>Toplam Belge</div>
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#2563eb" }}>
                {dashboard.totalDocuments}
              </div>
            </div>

            {/* High Risk Documents */}
            <div
              style={{
                padding: "24px",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "0 0 0 100%",
                  opacity: 0.3,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  📋
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Yüksek Riskli Belgeler
                </div>
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: "#dc2626" }}>
                {dashboard.highRiskDocumentsCount}
              </div>
            </div>
          </div>

          {/* Client Risk Distribution */}
          <div
            style={{
              padding: "32px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              marginBottom: "32px",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px", color: "#111827" }}>
              Müşteri Risk Dağılımı
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Low Risk */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                      }}
                    />
                    <span style={{ color: "#374151", fontWeight: "500", fontSize: "14px" }}>Düşük</span>
                  </div>
                  <span style={{ fontWeight: "700", fontSize: "18px", color: "#111827" }}>
                    {dashboard.clientRiskDistribution.low}
                  </span>
                </div>
                <div
                  style={{
                    height: "32px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.low / totalClients) * 100 : 0}%`,
                      backgroundColor: "#10b981",
                      borderRadius: "8px",
                      transition: "width 0.5s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "8px",
                    }}
                  >
                    {dashboard.clientRiskDistribution.low > 0 && (
                      <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.low / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medium Risk */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "#f59e0b",
                      }}
                    />
                    <span style={{ color: "#374151", fontWeight: "500", fontSize: "14px" }}>Orta</span>
                  </div>
                  <span style={{ fontWeight: "700", fontSize: "18px", color: "#111827" }}>
                    {dashboard.clientRiskDistribution.medium}
                  </span>
                </div>
                <div
                  style={{
                    height: "32px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.medium / totalClients) * 100 : 0}%`,
                      backgroundColor: "#f59e0b",
                      borderRadius: "8px",
                      transition: "width 0.5s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "8px",
                    }}
                  >
                    {dashboard.clientRiskDistribution.medium > 0 && (
                      <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.medium / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* High Risk */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "#dc2626",
                      }}
                    />
                    <span style={{ color: "#374151", fontWeight: "500", fontSize: "14px" }}>Yüksek</span>
                  </div>
                  <span style={{ fontWeight: "700", fontSize: "18px", color: "#111827" }}>
                    {dashboard.clientRiskDistribution.high}
                  </span>
                </div>
                <div
                  style={{
                    height: "32px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${totalClients > 0 ? (dashboard.clientRiskDistribution.high / totalClients) * 100 : 0}%`,
                      backgroundColor: "#dc2626",
                      borderRadius: "8px",
                      transition: "width 0.5s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "8px",
                    }}
                  >
                    {dashboard.clientRiskDistribution.high > 0 && (
                      <span style={{ color: "white", fontSize: "12px", fontWeight: "600" }}>
                        {totalClients > 0
                          ? Math.round((dashboard.clientRiskDistribution.high / totalClients) * 100)
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/risk/alerts"
              style={{
                padding: "12px 24px",
                backgroundColor: "#2563eb",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1d4ed8";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              🚨 Uyarıları Görüntüle
            </Link>
            <Link
              href="/musteriler"
              style={{
                padding: "12px 24px",
                backgroundColor: "white",
                color: "#2563eb",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid #2563eb",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#eff6ff";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              👥 Müşterileri Görüntüle
            </Link>
          </div>
        </>
      )}

      {/* Add pulse animation for loading */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
