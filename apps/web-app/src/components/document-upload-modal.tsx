"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, uploadZipFile, listInvoices, listTransactions, listClientCompanies } from "@repo/api-client";
import { colors, spacing, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

// Use any for File type to avoid SSR issues - validation happens client-side
const uploadSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri seçimi zorunludur."),
  type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]),
  relatedInvoiceId: z.string().optional().nullable(),
  relatedTransactionId: z.string().optional().nullable(),
  file: z.any().refine((file) => file && file.size > 0, "Lütfen bir dosya seçin."),
  zipFile: z.any().optional(),
});

const zipUploadSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri seçimi zorunludur."),
  type: z.enum(["INVOICE", "BANK_STATEMENT", "RECEIPT", "OTHER"]).optional(),
  relatedInvoiceId: z.string().optional().nullable(),
  relatedTransactionId: z.string().optional().nullable(),
  zipFile: z.any().refine((file) => file && file.size > 0, "Lütfen bir ZIP dosyası seçin."),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface DocumentUploadModalProps {
  clientCompanyId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentUploadModal({ clientCompanyId: propClientCompanyId, isOpen, onClose }: DocumentUploadModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"single" | "zip">("single");
  const [batchResult, setBatchResult] = useState<any>(null);
  const { themeColors } = useTheme();

  // Fetch companies if no clientCompanyId provided
  const { data: companiesData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100, isActive: true }),
    enabled: isOpen && !propClientCompanyId,
  });

  const companies = companiesData?.data.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<UploadForm & { zipFile?: File }>({
    resolver: zodResolver(uploadMode === "zip" ? zipUploadSchema : uploadSchema),
    defaultValues: {
      clientCompanyId: propClientCompanyId || "",
      type: "OTHER",
      relatedInvoiceId: null,
      relatedTransactionId: null,
    },
  });

  const selectedClientId = watch("clientCompanyId") || propClientCompanyId;

  const { data: invoicesData } = useQuery({
    queryKey: ["invoices", selectedClientId],
    queryFn: () => listInvoices({ clientCompanyId: selectedClientId!, pageSize: 100 }),
    enabled: isOpen && !!selectedClientId,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions", selectedClientId],
    queryFn: () => listTransactions({ clientCompanyId: selectedClientId, pageSize: 100 }),
    enabled: isOpen && !!selectedClientId,
  });

  const mutation = useMutation({
    mutationFn: async (data: UploadForm) => {
      return uploadDocument(data.file, {
        clientCompanyId: data.clientCompanyId,
        type: data.type,
        relatedInvoiceId: data.relatedInvoiceId || null,
        relatedTransactionId: data.relatedTransactionId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      reset();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Belge yüklenirken bir hata oluştu.");
    },
  });

  const zipMutation = useMutation({
    mutationFn: async (data: z.infer<typeof zipUploadSchema>) => {
      return uploadZipFile(data.zipFile, {
        clientCompanyId: data.clientCompanyId,
        type: data.type,
        relatedInvoiceId: data.relatedInvoiceId || null,
        relatedTransactionId: data.relatedTransactionId || null,
      });
    },
    onSuccess: (result) => {
      setBatchResult(result.data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => {
      setError(err.message || "ZIP dosyası yüklenirken bir hata oluştu.");
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
          backgroundColor: themeColors.white,
          padding: spacing.lg,
          borderRadius: borderRadius.md,
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: spacing.lg }}>Belge Yükle</h2>

        {/* Upload Mode Toggle */}
        <div style={{ marginBottom: spacing.md, display: "flex", gap: spacing.sm }}>
          <button
            type="button"
            onClick={() => {
              setUploadMode("single");
              setBatchResult(null);
              reset();
            }}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: uploadMode === "single" ? colors.primary : themeColors.gray[50],
              color: uploadMode === "single" ? colors.white : themeColors.text.primary,
              border: `1px solid ${themeColors.border}`,
              borderRadius: borderRadius.sm,
              cursor: "pointer",
            }}
          >
            Tek Dosya
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode("zip");
              setBatchResult(null);
              reset();
            }}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: uploadMode === "zip" ? colors.primary : themeColors.gray[50],
              color: uploadMode === "zip" ? colors.white : themeColors.text.primary,
              border: `1px solid ${themeColors.border}`,
              borderRadius: borderRadius.sm,
              cursor: "pointer",
            }}
          >
            ZIP Dosyası / Klasör
          </button>
        </div>

        {batchResult && (
          <div style={{ padding: "12px", backgroundColor: colors.successLight, borderRadius: borderRadius.sm, marginBottom: spacing.md }}>
            <h3 style={{ marginBottom: spacing.sm }}>Toplu Yükleme Sonucu</h3>
            <p>Toplam Dosya: {batchResult.totalFiles}</p>
            <p>Başarılı: {batchResult.successfulUploads}</p>
            <p>Başarısız: {batchResult.failedUploads}</p>
            {batchResult.errors.length > 0 && (
              <div style={{ marginTop: spacing.sm }}>
                <strong>Hatalar:</strong>
                <ul style={{ marginTop: spacing.xs, paddingLeft: "20px" }}>
                  {batchResult.errors.map((err: any, idx: number) => (
                    <li key={idx} style={{ fontSize: "14px" }}>
                      {err.fileName}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={
            uploadMode === "zip"
              ? handleSubmit((data: any) => {
                  setError(null);
                  if (data.zipFile) {
                    zipMutation.mutate({
                      clientCompanyId: data.clientCompanyId,
                      type: data.type,
                      relatedInvoiceId: data.relatedInvoiceId,
                      relatedTransactionId: data.relatedTransactionId,
                      zipFile: data.zipFile,
                    });
                  }
                })
              : handleSubmit(onSubmit)
          }
          style={{ display: "flex", flexDirection: "column", gap: spacing.md }}
        >
          {error && (
            <div style={{ padding: "12px", backgroundColor: colors.dangerLight, color: colors.danger, borderRadius: borderRadius.sm }}>
              {error}
            </div>
          )}

          {!propClientCompanyId && (
            <div>
              <label htmlFor="clientCompanyId" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
                Müşteri Şirketi *
              </label>
              <select
                id="clientCompanyId"
                {...register("clientCompanyId")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: errors.clientCompanyId ? `1px solid ${colors.danger}` : `1px solid ${themeColors.border}`,
                  borderRadius: borderRadius.sm,
                  fontSize: "16px",
                }}
              >
                <option value="">Seçiniz...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.clientCompanyId && (
                <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.clientCompanyId.message}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="type" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              Belge Türü *
            </label>
            <select
              id="type"
              {...register("type")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
              }}
            >
              <option value="INVOICE">Fatura</option>
              <option value="BANK_STATEMENT">Banka Ekstresi</option>
              <option value="RECEIPT">Dekont</option>
              <option value="OTHER">Diğer</option>
            </select>
            {errors.type && (
              <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="relatedInvoiceId" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              İlgili Fatura (Opsiyonel)
            </label>
            <select
              id="relatedInvoiceId"
              {...register("relatedInvoiceId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
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
            <label htmlFor="relatedTransactionId" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              İlgili Mali Hareket (Opsiyonel)
            </label>
            <select
              id="relatedTransactionId"
              {...register("relatedTransactionId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
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

          {uploadMode === "single" ? (
            <div>
              <label htmlFor="file" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
                Dosya Seç *
              </label>
              <input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
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
                <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.file.message as string}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="zipFile" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
                ZIP Dosyası Seç *
              </label>
              <input
                id="zipFile"
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setValue("zipFile", file, { shouldValidate: true });
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
              {errors.zipFile && (
                <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.zipFile.message as string}</p>
              )}
              <p style={{ fontSize: "12px", color: themeColors.text.secondary, marginTop: spacing.xs }}>
                ZIP dosyası içindeki tüm desteklenen dosyalar (PDF, resim, Excel) otomatik olarak yüklenecektir.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: themeColors.gray[50],
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || zipMutation.isPending}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: isSubmitting || zipMutation.isPending ? "not-allowed" : "pointer",
                opacity: isSubmitting || zipMutation.isPending ? 0.6 : 1,
              }}
            >
              {isSubmitting || zipMutation.isPending
                ? uploadMode === "zip"
                  ? "ZIP Yükleniyor..."
                  : "Yükleniyor..."
                : uploadMode === "zip"
                ? "ZIP Yükle"
                : "Yükle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

