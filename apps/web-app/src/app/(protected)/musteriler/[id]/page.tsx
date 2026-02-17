"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClientCompany, listBankAccounts, deleteBankAccount } from "@repo/api-client";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { BankAccountModal } from "../../../../components/bank-account-modal";
import { DocumentList } from "../../../../components/document-list";
import { DocumentUploadModal } from "../../../../components/document-upload-modal";
import { useClientCompanyRiskScore } from "@/hooks/use-risk";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "@/lib/toast";

export default function ClientDetailPage() {
  const { themeColors } = useTheme();
  const params = useParams();
  // const router = useRouter(); // Reserved for future use
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState<"general" | "banks" | "invoices" | "transactions" | "documents" | "risk">("general");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<string | null>(null);
  const [deleteBankModal, setDeleteBankModal] = useState<{ open: boolean; accountId: string | null }>({
    open: false,
    accountId: null,
  });
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["clientCompany", clientId],
    queryFn: () => getClientCompany(clientId),
    enabled: !!clientId,
  });

  const { data: bankAccounts, isLoading: banksLoading } = useQuery({
    queryKey: ["bankAccounts", clientId],
    queryFn: () => listBankAccounts(clientId),
    enabled: !!clientId,
  });

  const deleteBankMutation = useMutation({
    mutationFn: (accountId: string) => deleteBankAccount(clientId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts", clientId] });
      toast.success("Banka hesabı başarıyla silindi.");
      setDeleteBankModal({ open: false, accountId: null });
    },
    onError: () => {
      toast.error("Banka hesabı silinirken bir hata oluştu.");
    },
  });

  const { data: riskScoreData, isLoading: riskLoading, error: riskError } = useClientCompanyRiskScore(clientId);

  if (clientLoading) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1400px", margin: "0 auto" }}>
        <Card>
          <div style={{ padding: spacing.lg }}>
            <Skeleton height="40px" width="60%" style={{ marginBottom: spacing.md }} />
            <Skeleton height="20px" width="80%" style={{ marginBottom: spacing.sm }} />
            <Skeleton height="20px" width="90%" style={{ marginBottom: spacing.sm }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </div>
    );
  }

  if (!client?.data) {
    return (
      <div style={{ padding: spacing.xxl, maxWidth: "1400px", margin: "0 auto" }}>
        <Card>
          <div style={{ textAlign: "center", padding: spacing.xxl }}>
            <p style={{ color: themeColors.text.secondary, marginBottom: spacing.md }}>Müşteri şirketi bulunamadı.</p>
            <Button asLink href="/musteriler" variant="outline">
              Müşteri listesine dön
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const clientData = client.data;

  return (
    <PageTransition>
      <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>{clientData.name}</h1>
        <div style={{ display: "flex", gap: spacing.sm }}>
          <Button asLink href={`/musteriler/${clientId}/edit`} variant="primary">
            Düzenle
          </Button>
          <Button asLink href="/musteriler" variant="outline">
            Geri
          </Button>
        </div>
      </div>

      <Tabs
        items={[
          {
            id: "general",
            label: "Genel Bilgiler",
            content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
          <div>
            <strong>Şirket Adı:</strong> {clientData.name}
          </div>
          <div>
            <strong>Şirket Türü:</strong> {clientData.legalType}
          </div>
          <div>
            <strong>Vergi Numarası:</strong> {clientData.taxNumber}
          </div>
          <div>
            <strong>Ticaret Sicil No:</strong> {clientData.tradeRegistryNumber || "-"}
          </div>
          <div>
            <strong>Sektör:</strong> {clientData.sector || "-"}
          </div>
          <div>
            <strong>Durum:</strong>{" "}
            <Badge variant={clientData.isActive ? "success" : "danger"} size="sm">
              {clientData.isActive ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <div>
            <strong>İlgili Kişi:</strong> {clientData.contactPersonName || "-"}
          </div>
          <div>
            <strong>Telefon:</strong> {clientData.contactPhone || "-"}
          </div>
          <div>
            <strong>E-posta:</strong> {clientData.contactEmail || "-"}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Adres:</strong> {clientData.address || "-"}
          </div>
          {clientData.startDate && (
            <div>
              <strong>Başlangıç Tarihi:</strong> {new Date(clientData.startDate).toLocaleDateString("tr-TR")}
            </div>
          )}
          {clientData.stats && (
            <>
              <div>
                <strong>Fatura Sayısı:</strong> {clientData.stats.invoiceCount}
              </div>
              <div>
                <strong>Mali Hareket Sayısı:</strong> {clientData.stats.transactionCount}
              </div>
            </>
          )}
        </div>
            ),
          },
          {
            id: "banks",
            label: "Banka Hesapları",
            content: (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <h2 style={{ margin: 0, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: themeColors.text.primary }}>Banka Hesapları</h2>
            <Button
              onClick={() => {
                setEditingBankAccount(null);
                setBankModalOpen(true);
              }}
            >
              Yeni Banka Hesabı Ekle
            </Button>
          </div>

          {banksLoading ? (
            <Card>
              <div style={{ padding: spacing.lg }}>
                <Skeleton height="40px" width="100%" style={{ marginBottom: spacing.sm }} />
                <Skeleton height="40px" width="100%" style={{ marginBottom: spacing.sm }} />
                <Skeleton height="40px" width="100%" />
              </div>
            </Card>
          ) : bankAccounts?.data.length === 0 ? (
            <p>Henüz banka hesabı bulunmamaktadır.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>Banka Adı</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>IBAN</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>Para Birimi</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>Birincil Hesap</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>Oluşturulma Tarihi</th>
                  <th style={{ padding: spacing.md, textAlign: "left", fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.secondary }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts?.data.map((account) => (
                  <tr key={account.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                    <td style={{ padding: spacing.md, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>{account.bankName}</td>
                    <td style={{ padding: spacing.md, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>{account.iban}</td>
                    <td style={{ padding: spacing.md, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>{account.currency}</td>
                    <td style={{ padding: spacing.md, color: themeColors.text.primary, fontSize: typography.fontSize.sm }}>
                      {account.isPrimary ? "✓" : "-"}
                    </td>
                    <td style={{ padding: spacing.md, color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {new Date(account.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: spacing.md }}>
                      <Button
                        onClick={() => {
                          setEditingBankAccount(account.id);
                          setBankModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        style={{ marginRight: spacing.xs }}
                      >
                        Düzenle
                      </Button>
                      <Button
                        onClick={() => setDeleteBankModal({ open: true, accountId: account.id })}
                        variant="danger"
                        size="sm"
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <BankAccountModal
            clientCompanyId={clientId}
            accountId={editingBankAccount}
            isOpen={bankModalOpen}
            onClose={() => {
              setBankModalOpen(false);
              setEditingBankAccount(null);
            }}
          />
        </div>
            ),
          },
          {
            id: "invoices",
            label: "Faturalar",
            content: (
              <div>
                <p>Faturalar listesi buraya gelecek.</p>
                <Link href={`/faturalar?clientCompanyId=${clientId}`}>Faturaları görüntüle</Link>
              </div>
            ),
          },
          {
            id: "transactions",
            label: "Mali Hareketler",
            content: (
              <div>
                <p>Mali hareketler listesi buraya gelecek.</p>
                <Link href={`/islemler?clientCompanyId=${clientId}`}>Mali hareketleri görüntüle</Link>
              </div>
            ),
          },
          {
            id: "documents",
            label: "Belgeler",
            content: (
              <div>
                <DocumentList
                  clientCompanyId={clientId}
                  onUploadClick={() => setDocumentModalOpen(true)}
                  canUpload={true}
                  canDelete={true}
                />
                <DocumentUploadModal
                  clientCompanyId={clientId}
                  isOpen={documentModalOpen}
                  onClose={() => setDocumentModalOpen(false)}
                />
              </div>
            ),
          },
          {
            id: "risk",
            label: "Risk Analizi",
            content: (
        <div>
          <h2 style={{ marginBottom: "20px" }}>Müşteri Risk Analizi</h2>
          {riskLoading && (
            <Card>
              <div style={{ padding: spacing.lg }}>
                <Skeleton height="40px" width="100%" style={{ marginBottom: spacing.sm }} />
                <Skeleton height="40px" width="100%" />
              </div>
            </Card>
          )}

          {riskError && (
            <Card style={{ backgroundColor: colors.dangerLight, border: `1px solid ${colors.danger}` }}>
              <p style={{ margin: 0, color: colors.danger, fontSize: typography.fontSize.sm }}>
                Risk skoru yüklenirken bir hata oluştu: {riskError instanceof Error ? riskError.message : "Bilinmeyen hata"}
              </p>
            </Card>
          )}

          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === "development" && riskScoreData && (
            <div style={{ padding: "8px", backgroundColor: themeColors.gray[100], fontSize: "12px", marginBottom: "8px" }}>
              Debug: riskScoreData exists: {riskScoreData ? "yes" : "no"}, 
              riskScore: {riskScoreData?.data?.riskScore ? "exists" : "null"},
              breakdown: {JSON.stringify(riskScoreData?.data?.breakdown)}
            </div>
          )}

          {!riskLoading && riskScoreData?.data && (
            <div style={{ padding: "20px", backgroundColor: themeColors.gray[100], borderRadius: borderRadius.md, marginBottom: "20px" }}>
              {riskScoreData.data.riskScore ? (
                <>
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                      <div>
                        <strong>Genel Risk Skoru:</strong>{" "}
                        <span
                          style={{
                            fontSize: "24px",
                            fontWeight: "bold",
                            color:
                              riskScoreData.data.riskScore.severity === "high"
                                ? colors.dangerDark
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? colors.warning
                                : colors.success,
                          }}
                        >
                          {riskScoreData.data.riskScore.score}
                        </span>
                        /100
                      </div>
                      <div>
                        <strong>Şiddet:</strong>{" "}
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: "500",
                            backgroundColor:
                              riskScoreData.data.riskScore.severity === "high"
                                ? `${colors.dangerDark}20`
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? `${colors.warning}20`
                                : `${colors.success}20`,
                            color:
                              riskScoreData.data.riskScore.severity === "high"
                                ? colors.dangerDark
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? colors.warning
                                : colors.success,
                          }}
                        >
                          {riskScoreData.data.riskScore.severity === "high"
                            ? "Yüksek"
                            : riskScoreData.data.riskScore.severity === "medium"
                            ? "Orta"
                            : "Düşük"}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>
                      Hesaplanma Tarihi: {new Date(riskScoreData.data.riskScore.generatedAt).toLocaleString("tr-TR")}
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ marginBottom: "12px" }}>Belge Dağılımı</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      <div style={{ padding: "12px", backgroundColor: themeColors.white, borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.success }}>
                          {riskScoreData.data.breakdown.low}
                        </div>
                        <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>Düşük Risk</div>
                      </div>
                      <div style={{ padding: "12px", backgroundColor: themeColors.white, borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.warning }}>
                          {riskScoreData.data.breakdown.medium}
                        </div>
                        <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>Orta Risk</div>
                      </div>
                      <div style={{ padding: "12px", backgroundColor: themeColors.white, borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: colors.danger }}>
                          {riskScoreData.data.breakdown.high}
                        </div>
                        <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>Yüksek Risk</div>
                      </div>
                    </div>
                  </div>

                  {riskScoreData.data.topTriggeredRules.length > 0 && (
                    <div>
                      <h3 style={{ marginBottom: "12px" }}>En Çok Tetiklenen Kurallar</h3>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {riskScoreData.data.topTriggeredRules.map((rule, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "12px",
                              backgroundColor: themeColors.white,
                              borderRadius: "4px",
                              border: `1px solid ${themeColors.border}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong>{rule.code}</strong>
                              <div style={{ fontSize: "14px", color: themeColors.text.secondary, marginTop: "4px" }}>{rule.description}</div>
                            </div>
                            <div style={{ fontSize: "14px", color: themeColors.text.secondary }}>{rule.count} kez tetiklendi</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: "16px", textAlign: "center", color: themeColors.text.secondary }}>
                  Bu müşteri için henüz risk skoru hesaplanmamış.
                </div>
              )}
            </div>
          )}

          {!riskLoading && !riskScoreData?.data && (
            <div style={{ padding: "16px", backgroundColor: themeColors.gray[200], borderRadius: "4px" }}>
              <p>Bu müşteri için henüz risk skoru hesaplanmamış.</p>
            </div>
          )}
        </div>
            ),
          },
        ]}
        defaultTab="general"
        onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
      />

      {/* Delete Bank Account Modal */}
      <Modal
        isOpen={deleteBankModal.open}
        onClose={() => setDeleteBankModal({ open: false, accountId: null })}
        title="Banka Hesabını Sil"
        size="sm"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ color: themeColors.text.primary }}>
            Bu banka hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </div>
        <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setDeleteBankModal({ open: false, accountId: null })}>
            İptal
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteBankModal.accountId) {
                deleteBankMutation.mutate(deleteBankModal.accountId);
              }
            }}
            loading={deleteBankMutation.isPending}
          >
            Sil
          </Button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}

