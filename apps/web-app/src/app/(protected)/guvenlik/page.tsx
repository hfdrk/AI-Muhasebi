"use client";

import { useQuery } from "@tanstack/react-query";
import { securityClient, getCurrentUser } from "@repo/api-client";
import { Card } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import { PageTransition } from "../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, typography } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

export default function SecurityDashboardPage() {
  const { themeColors } = useTheme();
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const userId = currentUser?.user?.id;

  // Fetch 2FA status
  const { data: ipWhitelistData } = useQuery({
    queryKey: ["ip-whitelist-check"],
    queryFn: () => securityClient.checkIPWhitelist(),
  });

  // Fetch account lockout status
  const { data: lockoutData } = useQuery({
    queryKey: ["account-lockout", userId],
    queryFn: () => {
      if (!userId) return null;
      return securityClient.getAccountLockoutStatus(userId);
    },
    enabled: !!userId,
  });

  const ipWhitelistStatus = ipWhitelistData?.data;
  const lockoutStatus = lockoutData?.data;

  return (
    <PageTransition>
      <div
        style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: themeColors.gray[50],
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
            color: themeColors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Güvenlik Ayarları
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          İki faktörlü kimlik doğrulama, IP izin listesi ve hesap güvenliği ayarlarını yönetin.
        </p>
      </div>

      {/* Quick Links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/guvenlik/2fa")}
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
              🔐
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: themeColors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                İki Faktörlü Kimlik Doğrulama
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                2FA'yı etkinleştir veya devre dışı bırak
              </p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          hoverable
          onClick={() => (window.location.href = "/guvenlik/ip-izin-listesi")}
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
              🌐
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: themeColors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                IP İzin Listesi
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                IP adreslerini izin listesine ekle
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Security Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: spacing.lg,
        }}
      >
        {/* IP Whitelist Status */}
        <Card variant="elevated" title="IP İzin Listesi Durumu">
          {ipWhitelistStatus ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <span style={{ fontSize: "24px" }}>
                  {ipWhitelistStatus.isWhitelisted ? "✅" : "⚠️"}
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    {ipWhitelistStatus.isWhitelisted ? "İzin Listesinde" : "İzin Listesinde Değil"}
                  </p>
                  <p
                    style={{
                      margin: `${spacing.xs} 0 0 0`,
                      fontSize: typography.fontSize.sm,
                      color: themeColors.text.secondary,
                    }}
                  >
                    IP: {ipWhitelistStatus.ipAddress}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Skeleton height="20px" width="100px" />
          )}
        </Card>

        {/* Account Lockout Status */}
        {lockoutStatus && (
          <Card variant="elevated" title="Hesap Kilidi Durumu">
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <span style={{ fontSize: "24px" }}>{lockoutStatus.locked ? "🔒" : "🔓"}</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: themeColors.text.primary,
                    }}
                  >
                    {lockoutStatus.locked ? "Kilitli" : "Aktif"}
                  </p>
                  {lockoutStatus.locked && lockoutStatus.lockoutUntil && (
                    <p
                      style={{
                        margin: `${spacing.xs} 0 0 0`,
                        fontSize: typography.fontSize.sm,
                        color: themeColors.text.secondary,
                      }}
                    >
                      Kilit: {new Date(lockoutStatus.lockoutUntil).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
              </div>
              <div
                style={{
                  marginTop: spacing.md,
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: themeColors.gray[50],
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                  }}
                >
                  Başarısız deneme: {lockoutStatus.failedAttempts}
                </p>
                <p
                  style={{
                    margin: `${spacing.xs} 0 0 0`,
                    fontSize: typography.fontSize.sm,
                    color: themeColors.text.secondary,
                  }}
                >
                  Kalan deneme: {lockoutStatus.remainingAttempts}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
    </PageTransition>
  );
}
