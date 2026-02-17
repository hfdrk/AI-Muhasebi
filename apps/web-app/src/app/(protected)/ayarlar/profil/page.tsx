"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserSettings, updateUserSettings, getCurrentUser } from "@repo/api-client";
import { useState, useEffect } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const userSettingsSchema = z.object({
  locale: z.string().max(10).nullable().optional(),
  timezone: z.string().max(50).nullable().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
});

type UserSettingsForm = z.infer<typeof userSettingsSchema>;

export default function ProfilePage() {
  const { themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: () => getUserSettings(),
    retry: false, // Don't retry on error
    staleTime: 60000, // Consider fresh for 60 seconds
  });

  const currentUser = userData?.data;
  const effectiveSettings = settingsData?.data;

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
    watch,
  } = useForm<UserSettingsForm>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      locale: effectiveSettings?.userSettings.locale ?? null,
      timezone: effectiveSettings?.userSettings.timezone ?? null,
      emailNotificationsEnabled: effectiveSettings?.userSettings.emailNotificationsEnabled ?? true,
      inAppNotificationsEnabled: effectiveSettings?.userSettings.inAppNotificationsEnabled ?? true,
    },
  });

  // Reset form when settings data loads
  useEffect(() => {
    if (effectiveSettings && !isLoading) {
      reset({
        locale: effectiveSettings.userSettings.locale ?? null,
        timezone: effectiveSettings.userSettings.timezone ?? null,
        emailNotificationsEnabled: effectiveSettings.userSettings.emailNotificationsEnabled ?? true,
        inAppNotificationsEnabled: effectiveSettings.userSettings.inAppNotificationsEnabled ?? true,
      });
    }
  }, [effectiveSettings, isLoading, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UserSettingsForm) => updateUserSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      setSuccessMessage("Profil ayarları başarıyla güncellendi.");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Profil ayarları güncellenirken bir hata oluştu.");
      setSuccessMessage(null);
    },
  });

  const onSubmit = (data: UserSettingsForm) => {
    updateMutation.mutate(data);
  };

  const localeValue = watch("locale");
  const timezoneValue = watch("timezone");

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: themeColors.text.primary }}>
          Profilim
        </h1>
        <p style={{ color: themeColors.text.secondary, fontSize: "16px" }}>
          Kişisel bilgilerinizi ve tercihlerinizi yönetin.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            padding: spacing.md,
            marginBottom: spacing.lg,
            backgroundColor: colors.successLight,
            color: colors.successDark,
            borderRadius: "4px",
            border: "1px solid #c3e6cb",
          }}
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: spacing.md,
            marginBottom: spacing.lg,
            backgroundColor: colors.dangerLight,
            color: colors.dangerDark,
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <Card>
          <div style={{ padding: spacing.xxl }}>
            <Skeleton height="40px" width="300px" style={{ marginBottom: spacing.md }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            style={{
              padding: spacing.xl,
              backgroundColor: themeColors.white,
              borderRadius: "8px",
              border: `1px solid ${themeColors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: themeColors.text.primary }}>
              Kişisel Bilgiler
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: themeColors.text.primary }}>
                Ad Soyad
              </label>
              <input
                type="text"
                value={currentUser?.user?.fullName || ""}
                disabled
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: themeColors.gray[50],
                  color: themeColors.text.secondary,
                }}
              />
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: themeColors.text.primary }}>
                E-posta
              </label>
              <input
                type="email"
                value={currentUser?.user?.email || ""}
                disabled
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: themeColors.gray[50],
                  color: themeColors.text.secondary,
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: spacing.xl,
              backgroundColor: themeColors.white,
              borderRadius: "8px",
              border: `1px solid ${themeColors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: themeColors.text.primary }}>
              Tercihler
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: themeColors.text.primary }}>
                Dil
              </label>
              <select
                {...register("locale")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Ofis varsayılanı kullan ({effectiveSettings?.effectiveLocale || "tr-TR"})</option>
                <option value="tr-TR">Türkçe (tr-TR)</option>
                <option value="en-US">English (en-US)</option>
              </select>
              {!localeValue && effectiveSettings && (
                <p style={{ color: themeColors.text.secondary, fontSize: "12px", marginTop: spacing.xs }}>
                  Ofis varsayılanı: {effectiveSettings.effectiveLocale}
                </p>
              )}
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: themeColors.text.primary }}>
                Saat Dilimi
              </label>
              <select
                {...register("timezone")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Ofis varsayılanı kullan ({effectiveSettings?.effectiveTimezone || "Europe/Istanbul"})</option>
                <option value="Europe/Istanbul">Europe/Istanbul</option>
                <option value="UTC">UTC</option>
              </select>
              {!timezoneValue && effectiveSettings && (
                <p style={{ color: themeColors.text.secondary, fontSize: "12px", marginTop: spacing.xs }}>
                  Ofis varsayılanı: {effectiveSettings.effectiveTimezone}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              padding: spacing.xl,
              backgroundColor: themeColors.white,
              borderRadius: "8px",
              border: `1px solid ${themeColors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: themeColors.text.primary }}>
              Bildirimler
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.md,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  {...register("emailNotificationsEnabled")}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500, color: themeColors.text.primary }}>E-posta bildirimleri</span>
              </label>
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.md,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  {...register("inAppNotificationsEnabled")}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500, color: themeColors.text.primary }}>Uygulama içi bildirimler</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      )}
    </div>
    </PageTransition>
  );
}
