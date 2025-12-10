"use client";

import { useRiskDashboard } from "@/hooks/use-risk";
import Link from "next/link";

export default function RiskDashboardPage() {
  const { data, isLoading, error } = useRiskDashboard();

  if (isLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Yükleniyor...</p>
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
      <div style={{ padding: "40px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Risk Panosu</h1>
          <p style={{ color: "#666" }}>Genel risk durumu ve istatistikler</p>
        </div>
        <div
          style={{
            padding: "20px",
            backgroundColor: isAuthError ? "#fef3c7" : isTenantError ? "#dbeafe" : "#fee2e2",
            borderRadius: "8px",
            border: `1px solid ${isAuthError ? "#fcd34d" : isTenantError ? "#93c5fd" : "#fca5a5"}`,
            color: isAuthError ? "#92400e" : isTenantError ? "#1e40af" : "#991b1b",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Hata oluştu</p>
          <p style={{ fontSize: "14px", marginBottom: "12px" }}>
            {error instanceof Error ? error.message : "Risk verileri yüklenirken bir hata oluştu."}
          </p>
          {isTenantError && (
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Risk panosunu görüntülemek için önce bir şirket/ofis seçmeniz gerekiyor.
              </p>
              <p style={{ fontSize: "12px", marginBottom: "12px", color: "#1e3a8a" }}>
                Lütfen sayfanın üst kısmındaki "Şirket / Ofis" seçicisinden bir kiracı seçin veya ana sayfaya dönün.
              </p>
              <Link
                href="/anasayfa"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          )}
          {isAuthError && !isTenantError && (
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Risk panosunu görüntülemek için giriş yapmanız gerekiyor.
              </p>
              <Link
                href="/auth/login"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Giriş Yap
              </Link>
            </div>
          )}
          {!isAuthError && !isTenantError && (
            <p style={{ fontSize: "12px", marginTop: "8px", color: "#7f1d1d" }}>
              Backend API'nin çalıştığından emin olun.
            </p>
          )}
        </div>
      </div>
    );
  }

  const dashboard = data?.data;

  if (!dashboard) {
    return (
      <div style={{ padding: "40px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Risk Panosu</h1>
          <p style={{ color: "#666" }}>Genel risk durumu ve istatistikler</p>
        </div>
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f3f4f6",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            color: "#374151",
          }}
        >
          <p>Henüz risk verisi bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Risk Panosu</h1>
        <p style={{ color: "#666" }}>Genel risk durumu ve istatistikler</p>
      </div>

      {dashboard && (
        <>
          {/* Key Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Yüksek Riskli Müşteriler</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc2626" }}>
                {dashboard.highRiskClientCount}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Kritik Uyarılar</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc2626" }}>
                {dashboard.openCriticalAlertsCount}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Toplam Belge</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb" }}>{dashboard.totalDocuments}</div>
            </div>

            <div
              style={{
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Yüksek Riskli Belgeler</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc2626" }}>
                {dashboard.highRiskDocumentsCount}
              </div>
            </div>
          </div>

          {/* Client Risk Distribution */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#fff",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: "1px solid #e0e0e0",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>Müşteri Risk Dağılımı</h2>
            <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#666" }}>Düşük</span>
                  <span style={{ fontWeight: "bold" }}>{dashboard.clientRiskDistribution.low}</span>
                </div>
                <div
                  style={{
                    height: "24px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(dashboard.clientRiskDistribution.low / (dashboard.clientRiskDistribution.low + dashboard.clientRiskDistribution.medium + dashboard.clientRiskDistribution.high || 1)) * 100}%`,
                      backgroundColor: "#10b981",
                    }}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#666" }}>Orta</span>
                  <span style={{ fontWeight: "bold" }}>{dashboard.clientRiskDistribution.medium}</span>
                </div>
                <div
                  style={{
                    height: "24px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(dashboard.clientRiskDistribution.medium / (dashboard.clientRiskDistribution.low + dashboard.clientRiskDistribution.medium + dashboard.clientRiskDistribution.high || 1)) * 100}%`,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#666" }}>Yüksek</span>
                  <span style={{ fontWeight: "bold" }}>{dashboard.clientRiskDistribution.high}</span>
                </div>
                <div
                  style={{
                    height: "24px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(dashboard.clientRiskDistribution.high / (dashboard.clientRiskDistribution.low + dashboard.clientRiskDistribution.medium + dashboard.clientRiskDistribution.high || 1)) * 100}%`,
                      backgroundColor: "#dc2626",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/risk/alerts"
              style={{
                padding: "10px 20px",
                backgroundColor: "#2563eb",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              Uyarıları Görüntüle
            </Link>
            <Link
              href="/musteriler"
              style={{
                padding: "10px 20px",
                backgroundColor: "#fff",
                color: "#2563eb",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "500",
                border: "1px solid #2563eb",
              }}
            >
              Müşterileri Görüntüle
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

