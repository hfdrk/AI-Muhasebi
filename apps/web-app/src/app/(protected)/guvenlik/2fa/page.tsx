"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { securityClient, getCurrentUser } from "@repo/api-client";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Modal } from "../../../../components/ui/Modal";
import { PageTransition } from "../../../../components/ui/PageTransition";
import { colors, spacing, borderRadius, typography } from "../../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "../../../../lib/toast";

export default function TwoFactorAuthPage() {
  const { themeColors } = useTheme();
  const [verificationToken, setVerificationToken] = useState<string>("");
  const [showBackupCodes, setShowBackupCodes] = useState<boolean>(false);
  const [disableModal, setDisableModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const userId = currentUser?.user?.id;

  // Enable 2FA mutation
  const enable2FAMutation = useMutation({
    mutationFn: () => securityClient.enable2FA(userId),
    onSuccess: (_data) => {
      toast.info("2FA kurulumu başlatıldı. Lütfen QR kodu tarayın ve doğrulama kodunu girin.");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Verify and enable 2FA mutation
  const verify2FAMutation = useMutation({
    mutationFn: () => {
      if (!verificationToken || verificationToken.length !== 6) {
        throw new Error("6 haneli doğrulama kodu gerekli");
      }
      return securityClient.verifyAndEnable2FA(verificationToken, userId);
    },
    onSuccess: (data) => {
      if (data.data.success) {
        toast.success("2FA başarıyla etkinleştirildi!");
        setVerificationToken("");
        queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      } else {
        toast.error(data.data.message || "Doğrulama başarısız");
      }
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: () => securityClient.disable2FA(userId),
    onSuccess: () => {
      toast.success("2FA devre dışı bırakıldı!");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const twoFactorAuth = enable2FAMutation.data?.data;

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
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/guvenlik" icon="←">
            Geri
          </Button>
        </div>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: themeColors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          İki Faktörlü Kimlik Doğrulama (2FA)
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: themeColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Hesabınızı ekstra bir güvenlik katmanı ile koruyun. 2FA etkinleştirildiğinde, giriş yaparken telefonunuzdaki
          doğrulama kodunu da girmeniz gerekecektir.
        </p>
      </div>

      {/* Info Card */}
      <Card
        variant="outlined"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>ℹ️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              2FA Nasıl Çalışır?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Google Authenticator, Microsoft Authenticator veya benzeri bir uygulama kullanarak QR kodu tarayın.
              Uygulama her 30 saniyede bir yeni doğrulama kodu üretecektir. Giriş yaparken bu kodu girmeniz
              gerekecektir.
            </p>
          </div>
        </div>
      </Card>

      {/* Enable 2FA */}
      {!twoFactorAuth && (
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <h2
            style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: themeColors.text.primary,
            }}
          >
            2FA'yı Etkinleştir
          </h2>
          <p
            style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.sm,
              color: themeColors.text.secondary,
            }}
          >
            Aşağıdaki butona tıklayarak 2FA kurulumunu başlatın. QR kodu görüntülenecek ve yedek kodlar
            oluşturulacaktır.
          </p>
          <Button
            variant="primary"
            onClick={() => enable2FAMutation.mutate()}
            loading={enable2FAMutation.isPending}
          >
            🔐 2FA'yı Etkinleştir
          </Button>
        </Card>
      )}

      {/* QR Code and Verification */}
      {twoFactorAuth && !twoFactorAuth.enabled && (
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <h2
            style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: themeColors.text.primary,
            }}
          >
            QR Kodu Tarayın
          </h2>
          <p
            style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.sm,
              color: themeColors.text.secondary,
            }}
          >
            Telefonunuzdaki kimlik doğrulama uygulamasını açın ve aşağıdaki QR kodu tarayın.
          </p>

          {twoFactorAuth.qrCode && (
            <div
              style={{
                marginBottom: spacing.md,
                textAlign: "center",
              }}
            >
              <img
                src={twoFactorAuth.qrCode}
                alt="2FA QR Code"
                style={{
                  maxWidth: "300px",
                  border: `2px solid ${themeColors.border}`,
                  borderRadius: borderRadius.md,
                  padding: spacing.sm,
                  backgroundColor: themeColors.white,
                }}
              />
            </div>
          )}

          {/* Backup Codes */}
          {twoFactorAuth.backupCodes && twoFactorAuth.backupCodes.length > 0 && (
            <div style={{ marginBottom: spacing.md }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.sm,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: themeColors.text.primary,
                  }}
                >
                  Yedek Kodlar
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                >
                  {showBackupCodes ? "Gizle" : "Göster"}
                </Button>
              </div>
              {showBackupCodes && (
                <div
                  style={{
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.warningLight,
                    border: `1px solid ${themeColors.border}`,
                  }}
                >
                  <p
                    style={{
                      margin: `0 0 ${spacing.sm} 0`,
                      fontSize: typography.fontSize.sm,
                      color: themeColors.text.secondary,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    ⚠️ Bu kodları güvenli bir yerde saklayın. Telefonunuza erişemezseniz bu kodları
                    kullanabilirsiniz.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: spacing.sm,
                    }}
                  >
                    {twoFactorAuth.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        style={{
                          padding: spacing.sm,
                          borderRadius: borderRadius.sm,
                          backgroundColor: themeColors.white,
                          fontFamily: "monospace",
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          textAlign: "center",
                          border: `1px solid ${themeColors.border}`,
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: themeColors.text.primary,
              }}
            >
              Doğrulama Kodu (6 haneli)
            </label>
            <div style={{ display: "flex", gap: spacing.sm, alignItems: "flex-start" }}>
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationToken(value);
                }}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: "200px",
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${themeColors.border}`,
                  fontSize: typography.fontSize.base,
                  backgroundColor: themeColors.white,
                  color: themeColors.text.primary,
                  fontFamily: "monospace",
                  letterSpacing: "4px",
                  textAlign: "center",
                }}
              />
              <Button
                variant="primary"
                onClick={() => verify2FAMutation.mutate()}
                loading={verify2FAMutation.isPending}
                disabled={verificationToken.length !== 6}
              >
                Doğrula ve Etkinleştir
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Disable 2FA */}
      {twoFactorAuth?.enabled && (
        <Card variant="elevated">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: themeColors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                2FA Etkin
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: themeColors.text.secondary,
                }}
              >
                İki faktörlü kimlik doğrulama şu anda etkin durumda.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setDisableModal(true)}
              loading={disable2FAMutation.isPending}
            >
              🔓 2FA'yı Devre Dışı Bırak
            </Button>
          </div>
        </Card>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <Modal
        isOpen={disableModal}
        onClose={() => setDisableModal(false)}
        title="2FA'yı Devre Dışı Bırak"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p>2FA'yı devre dışı bırakmak istediğinize emin misiniz? Bu işlem güvenliğinizi azaltacaktır.</p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDisableModal(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              disable2FAMutation.mutate();
              setDisableModal(false);
            }}
            loading={disable2FAMutation.isPending}
          >
            Devre Dışı Bırak
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}
