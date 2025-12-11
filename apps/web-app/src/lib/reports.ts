/**
 * Report utility functions
 */

export function getReportTypeLabel(code: string): string {
  const labels: Record<string, string> = {
    COMPANY_FINANCIAL_SUMMARY: "Müşteri Finansal Özeti",
    COMPANY_RISK_SUMMARY: "Müşteri Risk Özeti",
    TENANT_PORTFOLIO: "Portföy Özeti",
    DOCUMENT_ACTIVITY: "Belge ve Fatura Aktivitesi",
    AUDIT_PREPARATION: "Denetim Hazırlık Raporu",
  };
  return labels[code] || code;
}

export function getScheduleCronLabel(cron: string): string {
  const labels: Record<string, string> = {
    daily: "Günlük",
    weekly: "Haftalık",
    monthly: "Aylık",
  };
  return labels[cron] || cron;
}

export function formatReportDate(date: string | Date | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function requiresClientCompany(code: string): boolean {
  return (
    code === "COMPANY_FINANCIAL_SUMMARY" ||
    code === "COMPANY_RISK_SUMMARY" ||
    code === "AUDIT_PREPARATION"
  );
}

export function getStatusLabel(status: string | null): string {
  if (!status) return "-";
  const labels: Record<string, string> = {
    success: "Başarılı",
    failed: "Hatalı",
    active: "Aktif",
    passive: "Pasif",
  };
  return labels[status] || status;
}

