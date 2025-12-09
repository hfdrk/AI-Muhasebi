"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransaction, updateTransaction, listClientCompanies, listLedgerAccounts } from "@repo/api-client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const transactionLineSchema = z.object({
  ledgerAccountId: z.string().min(1, "Hesap seçilmelidir."),
  debitAmount: z.number().nonnegative("Borç tutarı negatif olamaz."),
  creditAmount: z.number().nonnegative("Alacak tutarı negatif olamaz."),
  description: z.string().optional(),
});

const transactionSchema = z.object({
  clientCompanyId: z.string().optional(),
  date: z.string().min(1, "Tarih gerekli."),
  referenceNo: z.string().min(1, "Referans no gerekli."),
  description: z.string().optional(),
  lines: z
    .array(transactionLineSchema)
    .min(2, "En az iki satır gerekli.")
    .refine(
      (lines) => {
        const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      {
        message: "Toplam borç ve toplam alacak eşit olmalıdır.",
      }
    ),
});

type TransactionForm = z.infer<typeof transactionSchema>;

export default function EditTransactionPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: transaction, isLoading: transactionLoading } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => getTransaction(transactionId),
    enabled: !!transactionId,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const { data: ledgerAccountsData } = useQuery({
    queryKey: ["ledgerAccounts"],
    queryFn: () => listLedgerAccounts(),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    values: transaction?.data
      ? {
          clientCompanyId: transaction.data.clientCompanyId || "",
          date: new Date(transaction.data.date).toISOString().split("T")[0],
          referenceNo: transaction.data.referenceNo || "",
          description: transaction.data.description || "",
          lines: transaction.data.lines?.map((line) => ({
            ledgerAccountId: line.ledgerAccountId,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            description: line.description || "",
          })) || [],
        }
      : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");

  const calculateTotals = () => {
    const totalDebit = watchedLines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = watchedLines.reduce((sum, line) => sum + line.creditAmount, 0);
    return { totalDebit, totalCredit };
  };

  const mutation = useMutation({
    mutationFn: (data: TransactionForm) =>
      updateTransaction(transactionId, {
        clientCompanyId: data.clientCompanyId || null,
        date: new Date(data.date),
        referenceNo: data.referenceNo,
        description: data.description || null,
        lines: data.lines.map((line) => ({
          ledgerAccountId: line.ledgerAccountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          description: line.description || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction", transactionId] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      router.push(`/transactions/${transactionId}`);
    },
    onError: (err: Error) => {
      setError(err.message || "Mali hareket güncellenirken bir hata oluştu.");
    },
  });

  const onSubmit = (data: TransactionForm) => {
    setError(null);
    mutation.mutate(data);
  };

  if (transactionLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!transaction?.data) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Mali hareket bulunamadı.</p>
        <Link href="/islemler">Mali hareket listesine dön</Link>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <h1 style={{ marginBottom: "24px" }}>Mali Hareket Düzenle</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {error && (
          <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label htmlFor="clientCompanyId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Müşteri Şirketi
            </label>
            <select
              id="clientCompanyId"
              {...register("clientCompanyId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="">Seçiniz...</option>
              {clientsData?.data.data.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Tarih *
            </label>
            <input
              id="date"
              type="date"
              {...register("date")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.date && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="referenceNo" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Referans No *
            </label>
            <input
              id="referenceNo"
              {...register("referenceNo")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.referenceNo && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.referenceNo.message}</p>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="description" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Açıklama
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={2}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Hareket Satırları</h2>
            <button
              type="button"
              onClick={() =>
                append({
                  ledgerAccountId: "",
                  debitAmount: 0,
                  creditAmount: 0,
                  description: "",
                })
              }
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Satır Ekle
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Hesap Kodu</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Hesap Adı</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Borç</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Alacak</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const selectedAccount = ledgerAccountsData?.data.find(
                  (acc) => acc.id === watchedLines[index]?.ledgerAccountId
                );
                return (
                  <tr key={field.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>
                      <select
                        {...register(`lines.${index}.ledgerAccountId`)}
                        style={{
                          width: "150px",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                      >
                        <option value="">Seçiniz...</option>
                        {ledgerAccountsData?.data.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ fontSize: "14px" }}>{selectedAccount?.name || "-"}</span>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                        style={{
                          width: "120px",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          textAlign: "right",
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                        style={{
                          width: "120px",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          textAlign: "right",
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>
                      <input
                        {...register(`lines.${index}.description`)}
                        style={{
                          width: "100%",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>
                      {fields.length > 2 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {errors.lines && (
            <p style={{ color: "#c33", fontSize: "14px", marginBottom: "16px" }}>
              {errors.lines.message || errors.lines.root?.message}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <div>
              <strong>Toplam Borç:</strong>{" "}
              {totals.totalDebit.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div>
              <strong>Toplam Alacak:</strong>{" "}
              {totals.totalCredit.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              style={{
                color: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? "#28a745" : "#dc3545",
                fontWeight: "bold",
              }}
            >
              <strong>Fark:</strong>{" "}
              {Math.abs(totals.totalDebit - totals.totalCredit).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Link
            href={`/transactions/${transactionId}`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || Math.abs(totals.totalDebit - totals.totalCredit) >= 0.01}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isSubmitting || Math.abs(totals.totalDebit - totals.totalCredit) >= 0.01 ? "not-allowed" : "pointer",
              opacity: isSubmitting || Math.abs(totals.totalDebit - totals.totalCredit) >= 0.01 ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}

