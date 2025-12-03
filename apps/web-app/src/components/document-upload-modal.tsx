"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, listInvoices, listTransactions } from "@repo/api-client";

const uploadSchema = z.object({
  type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]),
  relatedInvoiceId: z.string().optional().nullable(),
  relatedTransactionId: z.string().optional().nullable(),
  file: z.instanceof(File).refine((file) => file.size > 0, "Lütfen bir dosya seçin."),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface DocumentUploadModalProps {
  clientCompanyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentUploadModal({ clientCompanyId, isOpen, onClose }: DocumentUploadModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: invoicesData } = useQuery({
    queryKey: ["invoices", clientCompanyId],
    queryFn: () => listInvoices({ clientCompanyId, pageSize: 100 }),
    enabled: isOpen,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions", clientCompanyId],
    queryFn: () => listTransactions({ clientCompanyId, pageSize: 100 }),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      type: "OTHER",
      relatedInvoiceId: null,
      relatedTransactionId: null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UploadForm) => {
      return uploadDocument(data.file, {
        clientCompanyId,
        type: data.type,
        relatedInvoiceId: data.relatedInvoiceId || null,
        relatedTransactionId: data.relatedTransactionId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientCompanyId] });
      reset();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Belge yüklenirken bir hata oluştu.");
    },
  });

  const onSubmit = (data: UploadForm) => {
    setError(null);
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "24px" }}>Belge Yükle</h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="type" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Belge Türü *
            </label>
            <select
              id="type"
              {...register("type")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="INVOICE">Fatura</option>
              <option value="BANK_STATEMENT">Banka Ekstresi</option>
              <option value="RECEIPT">Dekont</option>
              <option value="OTHER">Diğer</option>
            </select>
            {errors.type && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="relatedInvoiceId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              İlgili Fatura (Opsiyonel)
            </label>
            <select
              id="relatedInvoiceId"
              {...register("relatedInvoiceId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="">Seçiniz...</option>
              {invoicesData?.data.data.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.externalId || invoice.id.substring(0, 8)} - {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="relatedTransactionId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              İlgili Mali Hareket (Opsiyonel)
            </label>
            <select
              id="relatedTransactionId"
              {...register("relatedTransactionId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="">Seçiniz...</option>
              {transactionsData?.data.data.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.referenceNo || transaction.id.substring(0, 8)} - {new Date(transaction.date).toLocaleDateString("tr-TR")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="file" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Dosya Seç *
            </label>
            <input
              id="file"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setValue("file", file, { shouldValidate: true });
                }
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.file && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.file.message}</p>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Yükleniyor..." : "Yükle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

