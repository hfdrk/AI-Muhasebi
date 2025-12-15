"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getScheduledReport,
  updateScheduledReport,
  listExecutionLogsForScheduled,
  listClientCompanies,
  getCurrentUser,
} from "@repo/api-client";
import { getReportTypeLabel, getScheduleCronLabel, getStatusLabel, formatReportDate, requiresClientCompany } from "@/lib/reports";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

const updateScheduledReportSchema = z.object({
  name: z.string().min(1, "Ad gerekli.").optional(),
  client_company_id: z.string().optional().nullable(),
  format: z.enum(["pdf", "excel"]).optional(),
  schedule_cron: z.enum(["daily", "weekly", "monthly"]).optional(),
  filters: z
    .object({
      start_date: z.string().min(1, "Başlangıç tarihi gerekli."),
      end_date: z.string().min(1, "Bitiş tarihi gerekli."),
    })
    .optional(),
  recipients: z.array(z.string().email("Geçerli bir e-posta adresi giriniz.")).min(1, "En az bir alıcı e-posta adresi girmelisiniz.").optional(),
  is_active: z.boolean().optional(),
});

type UpdateScheduledReportForm = z.infer<typeof updateScheduledReportSchema>;

export default function ScheduledReportDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const currentTenant = currentUser?.tenants.find((t) => t.status === "active");
  const userRole = currentTenant?.role;
  const canManage = userRole === "TenantOwner" || userRole === "Accountant";

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["scheduledReport", id],
    queryFn: () => getScheduledReport(id),
    enabled: !!id,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["executionLogs", id],
    queryFn: () => listExecutionLogsForScheduled(id),
    enabled: !!id,
  });


  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const report = reportData?.data;
  const logs = logsData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateScheduledReportForm>({
    resolver: zodResolver(updateScheduledReportSchema),
    values: report
      ? {
          name: report.name,
          client_company_id: report.clientCompany?.id || null,
          format: report.format,
          schedule_cron: report.scheduleCron,
          filters: {
            start_date: (report as any).filters?.start_date
              ? new Date((report as any).filters.start_date).toISOString().split("T")[0]
              : new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0],
            end_date: (report as any).filters?.end_date
              ? new Date((report as any).filters.end_date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          },
          recipients: report.recipients,
          is_active: report.isActive,
        }
      : undefined,
  });

  const selectedReportCode = report?.reportCode || "";
  const recipients = watch("recipients") || report?.recipients || [];

  const updateMutation = useMutation({
    mutationFn: (data: UpdateScheduledReportForm) => updateScheduledReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReport", id] });
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      setIsEditing(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "Rapor güncellenirken bir hata oluştu.");
    },
  });

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

  const onSubmit = (data: UpdateScheduledReportForm) => {
    if (requiresClientCompany(selectedReportCode) && !data.client_company_id) {
      setError("Bu rapor türü için müşteri şirketi gerekli.");
      return;
    }

    const submitData: any = {};
    if (data.name !== undefined) submitData.name = data.name;
    if (data.client_company_id !== undefined) submitData.client_company_id = data.client_company_id;
    if (data.format !== undefined) submitData.format = data.format;
    if (data.schedule_cron !== undefined) submitData.schedule_cron = data.schedule_cron;
    if (data.filters !== undefined) {
      submitData.filters = {
        start_date: new Date(data.filters.start_date).toISOString(),
        end_date: new Date(data.filters.end_date + "T23:59:59").toISOString(),
      };
    }
    if (data.recipients !== undefined) submitData.recipients = data.recipients;
    if (data.is_active !== undefined) submitData.is_active = data.is_active;

    updateMutation.mutate(submitData);
  };

  if (reportLoading) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.xxl }}>
            <Skeleton height="40px" width="300px" style={{ marginBottom: spacing.md }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <p>Rapor bulunamadı.</p>
        <Link href="/raporlar/zamanlanmis" style={{ color: colors.primary, textDecoration: "none" }}>
          ← Geri Dön
        </Link>
      </div>
    );
  }

  const clients = clientsData?.data.data || [];

  return (
    <PageTransition>
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xl, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
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
          <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
            {report.name}
          </h1>
        </div>
        {canManage && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Düzenle
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {isEditing && canManage ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            backgroundColor: colors.white,
            padding: spacing.xl,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            marginBottom: spacing.xl,
          }}
        >
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
                  border: `1px solid ${errors.name ? "#c33" : colors.border}`,
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              {errors.name && (
                <p style={{ color: "#c33", fontSize: "12px", marginTop: spacing.xs }}>{errors.name.message}</p>
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
                    border: `1px solid ${errors.client_company_id ? "#c33" : colors.border}`,
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
                  <p style={{ color: "#c33", fontSize: "12px", marginTop: spacing.xs }}>
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
                    border: `1px solid ${colors.border}`,
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
                    border: `1px solid ${colors.border}`,
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
                    border: `1px solid ${errors.filters?.start_date ? "#c33" : colors.border}`,
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
                {errors.filters?.start_date && (
                  <p style={{ color: "#c33", fontSize: "12px", marginTop: spacing.xs }}>
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
                    border: `1px solid ${errors.filters?.end_date ? "#c33" : colors.border}`,
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
                {errors.filters?.end_date && (
                  <p style={{ color: "#c33", fontSize: "12px", marginTop: spacing.xs }}>
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
                    border: `1px solid ${colors.border}`,
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
                {recipients.map((email) => (
                  <span
                    key={email}
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      backgroundColor: colors.gray[100],
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
                        color: colors.text.secondary,
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
                <p style={{ color: "#c33", fontSize: "12px", marginTop: spacing.xs }}>{errors.recipients.message}</p>
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
              disabled={isSubmitting || updateMutation.isPending}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: isSubmitting || updateMutation.isPending ? "not-allowed" : "pointer",
                opacity: isSubmitting || updateMutation.isPending ? 0.6 : 1,
              }}
            >
              {isSubmitting || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                reset();
                setError(null);
              }}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.white,
                color: colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            backgroundColor: colors.white,
            padding: spacing.xl,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            marginBottom: spacing.xl,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: spacing.lg }}>
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Rapor Türü</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>{getReportTypeLabel(report.reportCode)}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Format</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>{report.format === "pdf" ? "PDF" : "Excel"}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Sıklık</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>{getScheduleCronLabel(report.scheduleCron)}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Durum</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>
                {report.isActive ? getStatusLabel("active") : getStatusLabel("passive")}
              </p>
            </div>
            {report.clientCompany && (
              <div>
                <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                  Müşteri Şirket
                </p>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{report.clientCompany.name}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                Son Çalışma
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>
                {report.lastRunAt ? formatReportDate(report.lastRunAt) : "-"}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Son Durum</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>{getStatusLabel(report.lastRunStatus)}</p>
            </div>
          </div>
          <div style={{ marginTop: spacing.lg }}>
            <p style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: spacing.xs }}>Alıcılar</p>
            <p style={{ fontSize: "14px" }}>{report.recipients.join(", ")}</p>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: colors.white,
          padding: spacing.xl,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.lg }}>Çalışma Geçmişi</h2>

        {logsLoading ? (
          <SkeletonTable rows={3} columns={4} />
        ) : logs.length === 0 ? (
          <p style={{ color: colors.text.secondary }}>Kayıt bulunamadı.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: colors.gray[50], borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Başlangıç</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Bitiş</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Durum</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontWeight: 600 }}>Mesaj</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {formatReportDate(log.startedAt)}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {log.finishedAt ? formatReportDate(log.finishedAt) : "-"}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {getStatusLabel(log.status)}
                    </td>
                    <td style={{ padding: spacing.md, color: colors.text.secondary }}>
                      {log.message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}

