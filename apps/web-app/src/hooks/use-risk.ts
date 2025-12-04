import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { riskClient } from "@repo/api-client";
import type { RiskAlertStatus } from "@repo/core-domain";

export function useRiskDashboard() {
  return useQuery({
    queryKey: ["risk-dashboard"],
    queryFn: () => riskClient.getTenantRiskDashboard(),
  });
}

export function useDocumentRiskScore(documentId: string) {
  return useQuery({
    queryKey: ["document-risk-score", documentId],
    queryFn: () => riskClient.getDocumentRiskScore(documentId),
    enabled: !!documentId,
    retry: false, // Don't retry on errors - if risk score doesn't exist, it's not an error
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}

export function useClientCompanyRiskScore(clientCompanyId: string) {
  return useQuery({
    queryKey: ["client-company-risk-score", clientCompanyId],
    queryFn: () => riskClient.getClientCompanyRiskScore(clientCompanyId),
    enabled: !!clientCompanyId,
  });
}

export function useRiskAlerts(filters?: {
  clientCompanyId?: string;
  severity?: string;
  status?: RiskAlertStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["risk-alerts", filters],
    queryFn: () => riskClient.listRiskAlerts(filters),
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: RiskAlertStatus }) =>
      riskClient.updateAlertStatus(alertId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
    },
  });
}


