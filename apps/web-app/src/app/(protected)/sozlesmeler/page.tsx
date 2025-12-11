"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractClient } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

function formatDate(date: string | null | undefined): string {
  if (!date) return "Belirtilmemiş";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return date;
  }
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return "Belirtilmemiş";
  const currencyCode = currency || "TRY";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

function getExpirationStatusBadge(daysUntilExpiration: number | null, isExpired: boolean) {
  if (isExpired) {
    return (
      <span
        style={{
          backgroundColor: colors.error,
          color: colors.white,
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        Süresi Dolmuş
      </span>
    );
  }

  if (daysUntilExpiration === null) {
    return (
      <span
        style={{
          backgroundColor: colors.gray[300],
          color: colors.text.secondary,
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        Tarih Belirtilmemiş
      </span>
    );
  }

  if (daysUntilExpiration <= 30) {
    return (
      <span
        style={{
          backgroundColor: colors.error,
          color: colors.white,
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {daysUntilExpiration} gün kaldı (Acil)
      </span>
    );
  }

  if (daysUntilExpiration <= 60) {
    return (
      <span
        style={{
          backgroundColor: "#FFA500",
          color: colors.white,
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {daysUntilExpiration} gün kaldı
      </span>
    );
  }

  if (daysUntilExpiration <= 90) {
    return (
      <span
        style={{
          backgroundColor: "#FFD700",
          color: colors.text.primary,
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        {daysUntilExpiration} gün kaldı
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: colors.success,
        color: colors.white,
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
      }}
    >
      {daysUntilExpiration} gün kaldı
    </span>
  );
}

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "expiring" | "expired">("all");
  const queryClient = useQueryClient();

  const { data: summaryData, error: summaryError } = useQuery({
    queryKey: ["contract-summary"],
    queryFn: () => contractClient.getContractSummary(),
    retry: 1,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: allContractsData, isLoading: allLoading, error: allError } = useQuery({
    queryKey: ["contracts", "all"],
    queryFn: () => contractClient.getContracts(),
    enabled: activeTab === "all",
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const { data: expiringContractsData, isLoading: expiringLoading } = useQuery({
    queryKey: ["contracts", "expiring"],
    queryFn: () => contractClient.getExpiringContracts(90),
    enabled: activeTab === "expiring",
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const { data: expiredContractsData, isLoading: expiredLoading } = useQuery({
    queryKey: ["contracts", "expired"],
    queryFn: () => contractClient.getExpiredContracts(),
    enabled: activeTab === "expired",
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const checkExpirationsMutation = useMutation({
    mutationFn: () => contractClient.checkExpirations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-summary"] });
      alert("Sözleşme süresi kontrolü tamamlandı!");
    },
  });

  const summary = summaryData?.data;
  
  // The API returns { data: [...] } where data is the array directly
  const contracts =
    activeTab === "all"
      ? allContractsData?.data || []
      : activeTab === "expiring"
        ? expiringContractsData?.data || []
        : expiredContractsData?.data || [];

  const isLoading =
    activeTab === "all" ? allLoading : activeTab === "expiring" ? expiringLoading : expiredLoading;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <PageHeader title="Sözleşmeler" />
        <Button
          onClick={() => checkExpirationsMutation.mutate()}
          disabled={checkExpirationsMutation.isPending}
        >
          {checkExpirationsMutation.isPending ? "Kontrol Ediliyor..." : "Süre Kontrolü Yap"}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: spacing.md, marginBottom: spacing.lg }}>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>Toplam Sözleşme</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.text.primary }}>{summary.total}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>Yakında Dolacak</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFA500" }}>{summary.expiringSoon}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>Süresi Dolmuş</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.error }}>{summary.expired}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: spacing.md }}>
              <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>Toplam Değer</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.text.primary }}>
                {formatCurrency(summary.totalValue, "TRY")}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${colors.gray[300]}`, marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: spacing.md }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderBottom: activeTab === "all" ? `2px solid ${colors.primary}` : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "all" ? colors.primary : colors.text.secondary,
              fontWeight: activeTab === "all" ? "semibold" : "normal",
            }}
          >
            Tümü ({summary?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab("expiring")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderBottom: activeTab === "expiring" ? `2px solid ${colors.primary}` : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "expiring" ? colors.primary : colors.text.secondary,
              fontWeight: activeTab === "expiring" ? "semibold" : "normal",
            }}
          >
            Yakında Dolacak ({summary?.expiringSoon || 0})
          </button>
          <button
            onClick={() => setActiveTab("expired")}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: "none",
              borderBottom: activeTab === "expired" ? `2px solid ${colors.primary}` : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "expired" ? colors.primary : colors.text.secondary,
              fontWeight: activeTab === "expired" ? "semibold" : "normal",
            }}
          >
            Süresi Dolmuş ({summary?.expired || 0})
          </button>
        </div>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>Yükleniyor...</div>
        </Card>
      ) : (allError || expiringLoading || expiredLoading) ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.error }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⚠️</div>
            <div>Veri yüklenirken bir hata oluştu.</div>
            <div style={{ marginTop: spacing.sm, fontSize: "14px" }}>
              {(allError as Error)?.message || "Bilinmeyen hata"}
            </div>
            <Button
              onClick={() => window.location.reload()}
              style={{ marginTop: spacing.md, backgroundColor: colors.primary, color: colors.white }}
            >
              Sayfayı Yenile
            </Button>
          </div>
        </Card>
      ) : contracts.length === 0 ? (
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>📄</div>
            <div>Henüz sözleşme bulunmuyor.</div>
            <div style={{ marginTop: spacing.sm, fontSize: "14px" }}>
              Sözleşme belgelerini yükleyerek başlayabilirsiniz.
            </div>
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["contracts"] });
                queryClient.invalidateQueries({ queryKey: ["contract-summary"] });
              }}
              variant="ghost"
              style={{ marginTop: spacing.md }}
            >
              Yenile
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {contracts.map((contract) => (
            <Card key={contract.contractId}>
              <div style={{ padding: spacing.md }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "semibold", color: colors.text.primary }}>
                        {contract.contractNumber || "Sözleşme #" + contract.contractId.slice(0, 8)}
                      </h3>
                      {getExpirationStatusBadge(contract.daysUntilExpiration, contract.isExpired)}
                    </div>
                    <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                      <strong>Müşteri:</strong> {contract.clientCompanyName}
                    </div>
                    {contract.contractType && (
                      <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                        <strong>Tür:</strong> {contract.contractType}
                      </div>
                    )}
                    {contract.contractValue !== null && contract.contractValue !== undefined && (
                      <div style={{ fontSize: "14px", color: colors.text.secondary, marginBottom: spacing.xs }}>
                        <strong>Değer:</strong> {formatCurrency(contract.contractValue, contract.currency)}
                      </div>
                    )}
                    {contract.expirationDate && (
                      <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                        <strong>Bitiş Tarihi:</strong> {formatDate(contract.expirationDate)}
                      </div>
                    )}
                  </div>
                  <Link href={`/belgeler/${contract.documentId}`}>
                    <Button variant="ghost">Belgeyi Görüntüle</Button>
                  </Link>
                </div>
                {contract.renewalTerms && (
                  <div
                    style={{
                      marginTop: spacing.sm,
                      padding: spacing.sm,
                      backgroundColor: colors.gray[50],
                      borderRadius: "4px",
                      fontSize: "13px",
                      color: colors.text.secondary,
                    }}
                  >
                    <strong>Yenileme Koşulları:</strong> {contract.renewalTerms}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
