"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScheduledReport,
  listReportDefinitions,
  listClientCompanies,
  getCurrentUser,
} from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requiresClientCompany } from "@/lib/reports";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

// Define schema at module level to avoid initialization issues
const scheduledReportSchema = z.object({
  name: z.string().min(1, "Ad gerekli."),
  report_code: z.string().min(1, "Rapor türü gerekli."),
  client_company_id: z.string().nullable().optional(),
  format: z.enum(["pdf", "excel"]),
  schedule_cron: z.enum(["daily", "weekly", "monthly"]),
  filters: z.object({
    start_date: z.string().min(1, "Başlangıç tarihi gerekli."),
    end_date: z.string().min(1, "Bitiş tarihi gerekli."),
  }),
  recipients: z.array(z.string().email("Geçerli bir e-posta adresi giriniz.")).min(1, "En az bir alıcı e-posta adresi girmelisiniz."),
  is_active: z.boolean(),
});

type ScheduledReportForm = z.infer<typeof scheduledReportSchema>;

export default function NewScheduledReportPage() {
  const { themeColors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // All hooks must be called before any conditional returns
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const { data: reportDefinitionsData, isLoading: isLoadingDefinitions, error: reportDefinitionsError } = useQuery({
    queryKey: ["reportDefinitions"],
    queryFn: () => listReportDefinitions(),
    retry: 1,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const form = useForm<ScheduledReportForm>({
    resolver: zodResolver(scheduledReportSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      report_code: "",
      client_company_id: null,
      format: "pdf",
      schedule_cron: "daily",
      filters: {
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
      },
      recipients: [],
      is_active: true,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const selectedReportCode = watch("report_code");
  const recipients = watch("recipients");

  const createMutation = useMutation({
    mutationFn: (data: ScheduledReportForm) => createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      router.push("/raporlar/zamanlanmis");
    },
    onError: (err: Error) => {
      setError(err.message || "Rapor oluşturulurken bir hata oluştu.");
    },
  });

  // Now check permissions after all hooks are called
  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants.find((t) => t.status === "active");
  const userRole = currentTenant?.role;
  const canManage = userRole === "TenantOwner" || userRole === "Accountant";

  if (!canManage) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <p style={{ color: colors.danger }}>Bu işlemi yapmak için yetkiniz yok.</p>
        <Link href="/raporlar/zamanlanmis" style={{ color: colors.primary, textDecoration: "none" }}>
          ← Geri Dön
        </Link>
      </div>
    );
  }

  const addRecipient = () => {
    if (emailInput && emailInput.includes("@")) {
      const currentRecipients = recipients || [];
      if (!currentRecipients.includes(emailInput)) {
        setValue("recipients", [...currentRecipients, emailInput]);
        setEmailInput("");
      }
    }
  };

  const removeRecipient = (email: string) => {
    const currentRecipients = recipients || [];
    setValue("recipients", currentRecipients.filter((e) => e !== email));
  };

  const onSubmit = (data: ScheduledReportForm) => {
    try {
      setError(null);
      
      // Additional validation for client company requirement
      if (requiresClientCompany(data.report_code) && !data.client_company_id) {
        setError("Bu rapor türü için müşteri şirketi gerekli.");
        return;
      }

      const submitData = {
        ...data,
        filters: {
          start_date: new Date(data.filters.start_date).toISOString(),
          end_date: new Date(data.filters.end_date + "T23:59:59").toISOString(),
        },
      };

      createMutation.mutate(submitData);
    } catch (err: any) {
      console.error("Form submission error:", err);
      setError(err?.message || "Form gönderilirken bir hata oluştu.");
    }
  };

  const reportDefinitions = reportDefinitionsData?.data || [];
  const clients = clientsData?.data.data || [];

  return (
    <PageTransition>
      <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xl }}>
        <Link
          href="/raporlar/zamanlanmis"
          style={{
            textDecoration: "none",
            color: colors.primary,
            fontSize: "14px",
            marginBottom: spacing.md,
            display: "inline-block",
          }}
        >
          ← Zamanlanmış Raporlara Dön
        </Link>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: themeColors.text.primary }}>
          Yeni Zamanlanmış Rapor Oluştur
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, (validationErrors) => {
          console.error("Form validation errors:", validationErrors);
          try {
            if (validationErrors && typeof validationErrors === 'object') {
              const errorEntries = Object.entries(validationErrors);
              if (errorEntries.length > 0) {
                const firstError = errorEntries[0][1];
                if (firstError && typeof firstError === 'object' && 'message' in firstError) {
                  setError(String(firstError.message));
                  return;
                }
              }
            }
            setError("Lütfen formdaki hataları düzeltin.");
          } catch (err) {
            console.error("Error handling validation errors:", err);
            setError("Form doğrulama hatası oluştu.");
          }
        })}
        style={{
          backgroundColor: themeColors.white,
          padding: spacing.xl,
          borderRadius: "8px",
          border: `1px solid ${themeColors.border}`,
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.dangerLight,
              color: colors.danger,
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            {error}
            {error.includes("limitine ulaşıldı") && (
              <div style={{ marginTop: "8px" }}>
                <Link
                  href="/ayarlar/abonelik"
                  style={{
                    color: colors.primaryLight,
                    textDecoration: "underline",
                    fontSize: "14px",
                  }}
                >
                  Abonelik & Kullanım sayfasına git
                </Link>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Ad *
            </label>
            <input
              {...register("name")}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${errors.name ? colors.danger : themeColors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            {errors.name && <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>{errors.name.message}</p>}
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Rapor Türü *
            </label>
            {isLoadingDefinitions ? (
              <div style={{ padding: spacing.sm, color: themeColors.text.secondary, fontSize: "14px" }}>
                <Skeleton height="20px" width="150px" />
              </div>
            ) : reportDefinitionsError ? (
              <div style={{ padding: spacing.sm, color: colors.danger, fontSize: "14px" }}>
                <div style={{ marginBottom: spacing.xs }}>
                  {reportDefinitionsError instanceof Error
                    ? reportDefinitionsError.message
                    : "Rapor türleri yüklenirken bir hata oluştu."}
                </div>
                <div style={{ fontSize: "12px", color: themeColors.text.secondary, marginTop: spacing.xs }}>
                  {reportDefinitionsError instanceof Error &&
                  reportDefinitionsError.message.includes("devre dışı")
                    ? "Lütfen REPORTING_ENABLED=true ayarını kontrol edin."
                    : "Lütfen sayfayı yenileyin veya yöneticinize başvurun."}
                </div>
              </div>
            ) : (
              <select
                {...register("report_code")}
                onChange={(e) => {
                  setValue("report_code", e.target.value);
                  if (!requiresClientCompany(e.target.value)) {
                    setValue("client_company_id", null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${errors.report_code ? colors.danger : themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Rapor türü seçin</option>
                {reportDefinitions.length === 0 ? (
                  <option value="" disabled>
                    Rapor türü bulunamadı
                  </option>
                ) : (
                  reportDefinitions.map((def) => (
                    <option key={def.code} value={def.code}>
                      {def.name}
                    </option>
                  ))
                )}
              </select>
            )}
            {errors.report_code && (
              <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>{errors.report_code.message}</p>
            )}
          </div>

          {requiresClientCompany(selectedReportCode) && (
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Müşteri Şirket *
              </label>
              <select
                {...register("client_company_id")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${errors.client_company_id ? colors.danger : themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="">Müşteri şirketi seçin</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.client_company_id && (
                <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>
                  {errors.client_company_id.message}
                </p>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Format *
              </label>
              <select
                {...register("format")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Sıklık *
              </label>
              <select
                {...register("schedule_cron")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                {...register("filters.start_date")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${errors.filters?.start_date ? colors.danger : themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              {errors.filters?.start_date && (
                <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>
                  {errors.filters.start_date.message}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                {...register("filters.end_date")}
                style={{
                  width: "100%",
                  padding: spacing.sm,
                  border: `1px solid ${errors.filters?.end_date ? colors.danger : themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              {errors.filters?.end_date && (
                <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>
                  {errors.filters.end_date.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: 500, fontSize: "14px" }}>
              Alıcı E-posta Adresleri *
            </label>
            <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.sm }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
                placeholder="E-posta adresi girin ve Enter'a basın"
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              <button
                type="button"
                onClick={addRecipient}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Ekle
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
              {recipients?.map((email) => (
                <span
                  key={email}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: themeColors.gray[100],
                    borderRadius: "4px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    style={{
                      background: "none",
                      border: "none",
                      color: themeColors.text.secondary,
                      cursor: "pointer",
                      fontSize: "16px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {errors.recipients && (
              <p style={{ color: colors.danger, fontSize: "12px", marginTop: spacing.xs }}>{errors.recipients.message}</p>
            )}
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
              <input
                type="checkbox"
                {...register("is_active")}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "14px" }}>Aktif</span>
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.xl }}>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: isSubmitting || createMutation.isPending ? "not-allowed" : "pointer",
              opacity: isSubmitting || createMutation.isPending ? 0.6 : 1,
            }}
          >
            {isSubmitting || createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link
            href="/raporlar/zamanlanmis"
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: themeColors.white,
              color: themeColors.text.primary,
              border: `1px solid ${themeColors.border}`,
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
    </PageTransition>
  );
}

