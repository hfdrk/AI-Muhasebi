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

export default function ClientDetailPage() {
  const params = useParams();
  // const router = useRouter(); // Reserved for future use
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState<"general" | "banks" | "invoices" | "transactions" | "documents" | "risk">("general");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<string | null>(null);
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
    },
  });

  const { data: riskScoreData, isLoading: riskLoading } = useClientCompanyRiskScore(clientId);

  if (clientLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!client?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Müşteri şirketi bulunamadı.</p>
        <Link href="/clients">Müşteri listesine dön</Link>
      </div>
    );
  }

  const clientData = client.data;

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>{clientData.name}</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/clients/${clientId}/edit`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Düzenle
          </Link>
          <Link
            href="/clients"
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              color: "inherit",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Geri
          </Link>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #ddd", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={() => setActiveTab("general")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "general" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "general" ? "#0066cc" : "inherit",
            }}
          >
            Genel Bilgiler
          </button>
          <button
            onClick={() => setActiveTab("banks")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "banks" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "banks" ? "#0066cc" : "inherit",
            }}
          >
            Banka Hesapları
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "invoices" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "invoices" ? "#0066cc" : "inherit",
            }}
          >
            Faturalar
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "transactions" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "transactions" ? "#0066cc" : "inherit",
            }}
          >
            Mali Hareketler
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "documents" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "documents" ? "#0066cc" : "inherit",
            }}
          >
            Belgeler
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "risk" ? "2px solid #0066cc" : "2px solid transparent",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: activeTab === "risk" ? "#0066cc" : "inherit",
            }}
          >
            Risk Analizi
          </button>
        </div>
      </div>

      {activeTab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: clientData.isActive ? "#d4edda" : "#f8d7da",
                color: clientData.isActive ? "#155724" : "#721c24",
                fontSize: "12px",
              }}
            >
              {clientData.isActive ? "Aktif" : "Pasif"}
            </span>
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
      )}

      {activeTab === "banks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Banka Hesapları</h2>
            <button
              onClick={() => {
                setEditingBankAccount(null);
                setBankModalOpen(true);
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Yeni Banka Hesabı Ekle
            </button>
          </div>

          {banksLoading ? (
            <p>Yükleniyor...</p>
          ) : bankAccounts?.data.length === 0 ? (
            <p>Henüz banka hesabı bulunmamaktadır.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>Banka Adı</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>IBAN</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Para Birimi</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Birincil Hesap</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Oluşturulma Tarihi</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts?.data.map((account) => (
                  <tr key={account.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>{account.bankName}</td>
                    <td style={{ padding: "12px" }}>{account.iban}</td>
                    <td style={{ padding: "12px" }}>{account.currency}</td>
                    <td style={{ padding: "12px" }}>
                      {account.isPrimary ? "✓" : "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {new Date(account.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => {
                          setEditingBankAccount(account.id);
                          setBankModalOpen(true);
                        }}
                        style={{
                          padding: "4px 8px",
                          marginRight: "8px",
                          color: "#0066cc",
                          border: "1px solid #0066cc",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Bu banka hesabını silmek istediğinize emin misiniz?")) {
                            deleteBankMutation.mutate(account.id);
                          }
                        }}
                        style={{
                          padding: "4px 8px",
                          color: "#dc3545",
                          border: "1px solid #dc3545",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Sil
                      </button>
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
      )}

      {activeTab === "invoices" && (
        <div>
          <p>Faturalar listesi buraya gelecek.</p>
          <Link href={`/invoices?clientCompanyId=${clientId}`}>Faturaları görüntüle</Link>
        </div>
      )}

      {activeTab === "transactions" && (
        <div>
          <p>Mali hareketler listesi buraya gelecek.</p>
          <Link href={`/transactions?clientCompanyId=${clientId}`}>Mali hareketleri görüntüle</Link>
        </div>
      )}

      {activeTab === "documents" && (
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
      )}

      {activeTab === "risk" && (
        <div>
          <h2 style={{ marginBottom: "20px" }}>Müşteri Risk Analizi</h2>
          {riskLoading && (
            <div style={{ padding: "16px" }}>
              <p>Risk skoru yükleniyor...</p>
            </div>
          )}

          {!riskLoading && riskScoreData?.data && (
            <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px", marginBottom: "20px" }}>
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
                                ? "#dc2626"
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? "#f59e0b"
                                : "#10b981",
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
                                ? "#dc262620"
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? "#f59e0b20"
                                : "#10b98120",
                            color:
                              riskScoreData.data.riskScore.severity === "high"
                                ? "#dc2626"
                                : riskScoreData.data.riskScore.severity === "medium"
                                ? "#f59e0b"
                                : "#10b981",
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
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Hesaplanma Tarihi: {new Date(riskScoreData.data.riskScore.generatedAt).toLocaleString("tr-TR")}
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ marginBottom: "12px" }}>Belge Dağılımı</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      <div style={{ padding: "12px", backgroundColor: "#fff", borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>
                          {riskScoreData.data.breakdown.low}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>Düşük Risk</div>
                      </div>
                      <div style={{ padding: "12px", backgroundColor: "#fff", borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
                          {riskScoreData.data.breakdown.medium}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>Orta Risk</div>
                      </div>
                      <div style={{ padding: "12px", backgroundColor: "#fff", borderRadius: "4px", textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>
                          {riskScoreData.data.breakdown.high}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>Yüksek Risk</div>
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
                              backgroundColor: "#fff",
                              borderRadius: "4px",
                              border: "1px solid #e0e0e0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong>{rule.code}</strong>
                              <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{rule.description}</div>
                            </div>
                            <div style={{ fontSize: "14px", color: "#666" }}>{rule.count} kez tetiklendi</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                  Bu müşteri için henüz risk skoru hesaplanmamış.
                </div>
              )}
            </div>
          )}

          {!riskLoading && !riskScoreData?.data && (
            <div style={{ padding: "16px", backgroundColor: "#e2e3e5", borderRadius: "4px" }}>
              <p>Bu müşteri için henüz risk skoru hesaplanmamış.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

