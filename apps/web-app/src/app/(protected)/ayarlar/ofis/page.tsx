"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantSettings, updateTenantSettings, getCurrentUser } from "@repo/api-client";
import { useState } from "react";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

const tenantSettingsSchema = z.object({
  displayName: z.string().max(255).nullable().optional(),
  logoUrl: z.string().url("Geçerli bir URL giriniz.").max(500).nullable().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  emailFromName: z.string().max(255).nullable().optional(),
  riskThresholds: z
    .object({
      high: z.number().min(0).max(100),
      critical: z.number().min(0).max(100),
    })
    .optional(),
  defaultReportPeriod: z
    .enum(["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "LAST_YEAR"])
    .optional(),
});

type TenantSettingsForm = z.infer<typeof tenantSettingsSchema>;

export default function OfficeSettingsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["tenantSettings"],
    queryFn: () => getTenantSettings(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants?.find((t: any) => t.status === "active");
  const userRole = currentTenant?.role;
  const canManage = userRole === "TenantOwner" || userRole === "Accountant";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TenantSettingsForm>({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: {
      displayName: settingsData?.data?.displayName ?? null,
      logoUrl: settingsData?.data?.logoUrl ?? null,
      locale: settingsData?.data?.locale ?? "tr-TR",
      timezone: settingsData?.data?.timezone ?? "Europe/Istanbul",
      emailFromName: settingsData?.data?.emailFromName ?? null,
      riskThresholds: settingsData?.data?.riskThresholds ?? { high: 70, critical: 90 },
      defaultReportPeriod: settingsData?.data?.defaultReportPeriod ?? "LAST_30_DAYS",
    },
  });

  // Reset form when settings data loads
  if (settingsData?.data && !isLoading) {
    reset({
      displayName: settingsData.data.displayName ?? null,
      logoUrl: settingsData.data.logoUrl ?? null,
      locale: settingsData.data.locale ?? "tr-TR",
      timezone: settingsData.data.timezone ?? "Europe/Istanbul",
      emailFromName: settingsData.data.emailFromName ?? null,
      riskThresholds: settingsData.data.riskThresholds ?? { high: 70, critical: 90 },
      defaultReportPeriod: settingsData.data.defaultReportPeriod ?? "LAST_30_DAYS",
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: TenantSettingsForm) => updateTenantSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantSettings"] });
      setSuccessMessage("Ofis ayarları başarıyla güncellendi.");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Ofis ayarları güncellenirken bir hata oluştu.");
      setSuccessMessage(null);
    },
  });

  const onSubmit = (data: TenantSettingsForm) => {
    updateMutation.mutate(data);
  };

  if (!canManage) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
          Ofis Ayarları
        </h1>
        <div
          style={{
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.text.secondary }}>
            Bu alanı görüntüleme yetkiniz yok. Ofis ayarlarını sadece yönetici kullanıcılar düzenleyebilir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
          Ofis Ayarları
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: "16px" }}>
          Ofis bilgilerinizi ve varsayılan ayarlarınızı yönetin.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            padding: spacing.md,
            marginBottom: spacing.lg,
            backgroundColor: "#d4edda",
            color: "#155724",
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
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: spacing.xxl, textAlign: "center" }}>Yükleniyor...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            style={{
              padding: spacing.xl,
              backgroundColor: colors.white,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
              Genel Bilgiler
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Ofis Adı
              </label>
              <input
                type="text"
                {...register("displayName")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
                placeholder="Ofis adı"
              />
              {errors.displayName && (
                <p style={{ color: colors.error, fontSize: "12px", marginTop: spacing.xs }}>{errors.displayName.message}</p>
              )}
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Logo URL
              </label>
              <input
                type="url"
                {...register("logoUrl")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
                placeholder="https://example.com/logo.png"
              />
              {errors.logoUrl && (
                <p style={{ color: colors.error, fontSize: "12px", marginTop: spacing.xs }}>{errors.logoUrl.message}</p>
              )}
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Varsayılan Dil
              </label>
              <select
                {...register("locale")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="tr-TR">Türkçe (tr-TR)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Saat Dilimi
              </label>
              <select
                {...register("timezone")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="Europe/Istanbul">Europe/Istanbul</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                E-posta Gönderen Adı
              </label>
              <input
                type="text"
                {...register("emailFromName")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
                placeholder="AI Muhasebe Ofisi"
              />
            </div>
          </div>

          <div
            style={{
              padding: spacing.xl,
              backgroundColor: colors.white,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
              Risk Eşikleri
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Yüksek Risk Eşiği (%)
              </label>
              <input
                type="number"
                {...register("riskThresholds.high", { valueAsNumber: true })}
                min="0"
                max="100"
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Kritik Risk Eşiği (%)
              </label>
              <input
                type="number"
                {...register("riskThresholds.critical", { valueAsNumber: true })}
                min="0"
                max="100"
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: spacing.xl,
              backgroundColor: colors.white,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg, color: colors.text.primary }}>
              Rapor Ayarları
            </h2>

            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, color: colors.text.primary }}>
                Varsayılan Rapor Dönemi
              </label>
              <select
                {...register("defaultReportPeriod")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="LAST_7_DAYS">Son 7 gün</option>
                <option value="LAST_30_DAYS">Son 30 gün</option>
                <option value="THIS_MONTH">Bu ay</option>
                <option value="LAST_MONTH">Geçen ay</option>
                <option value="THIS_YEAR">Bu yıl</option>
                <option value="LAST_YEAR">Geçen yıl</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
            <Link
              href="/ayarlar"
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                textDecoration: "none",
                color: colors.text.secondary,
                display: "inline-block",
              }}
            >
              İptal
            </Link>
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
  );
}

