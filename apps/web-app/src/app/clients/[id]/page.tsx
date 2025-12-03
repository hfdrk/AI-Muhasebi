"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClientCompany, listBankAccounts, deleteBankAccount } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { BankAccountModal } from "../../../../components/bank-account-modal";
import { DocumentList } from "../../../../components/document-list";
import { DocumentUploadModal } from "../../../../components/document-upload-modal";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState<"general" | "banks" | "invoices" | "transactions" | "documents">("general");
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
    </div>
  );
}

