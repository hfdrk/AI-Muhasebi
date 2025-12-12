"use client";

import { useQuery } from "@tanstack/react-query";
import { dbOptimizationClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../styles/design-system";

export default function DatabaseOptimizationDashboardPage() {
  // Fetch connection pool stats
  const { data: poolStatsData } = useQuery({
    queryKey: ["db-connection-pool-stats"],
    queryFn: () => dbOptimizationClient.getConnectionPoolStats(),
  });

  const poolStats = poolStatsData?.data;

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Veritabanı Optimizasyonu
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Veritabanı performansını optimize edin: indeks önerileri, bağlantı havuzu yönetimi, tablo boyutları ve
          temizleme işlemleri.
        </p>
      </div>

      {/* Warning Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>⚠️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              Yönetici Yetkisi Gerekli
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Bu sayfadaki tüm işlemler yönetici yetkisi gerektirir. Veritabanı optimizasyon işlemleri dikkatli
              bir şekilde gerçekleştirilmelidir.
            </p>
          </div>
        </div>
      </Card>

      {/* Connection Pool Stats */}
      {poolStats && (
        <Card variant="elevated" title="Bağlantı Havuzu Durumu" style={{ marginBottom: spacing.lg }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: spacing.md,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Aktif Bağlantılar
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                }}
              >
                {poolStats.activeConnections}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Boşta Bağlantılar
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                }}
              >
                {poolStats.idleConnections}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Toplam Bağlantılar
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                }}
              >
                {poolStats.totalConnections}
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Maksimum Bağlantılar
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                }}
              >
                {poolStats.maxConnections}
              </p>
            </div>
          </div>
          <div
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.gray[50],
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}
            >
              Kullanım Oranı:{" "}
              {((poolStats.totalConnections / poolStats.maxConnections) * 100).toFixed(1)}%
            </p>
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing.lg,
        }}
      >
        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/veritabani-optimizasyonu/indeksler")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.primaryPastel,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              📑
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                İndeks Yönetimi
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                İndeks önerilerini görüntüle ve oluştur
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/veritabani-optimizasyonu/tablo-boyutlari")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.infoLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Tablo Boyutları
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Tablo boyutlarını analiz et
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/veritabani-optimizasyonu/temizleme")}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: borderRadius.lg,
                backgroundColor: colors.warningLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              🧹
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                Tablo Temizleme
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                Tabloları vakum et ve optimize et
              </p>
            </div>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

