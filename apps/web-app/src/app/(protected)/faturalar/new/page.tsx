"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInvoice, listClientCompanies } from "@repo/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { colors, spacing, borderRadius } from "@/styles/design-system";

const invoiceLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  description: z.string().min(1, "Açıklama gerekli."),
  quantity: z.number().positive("Miktar pozitif olmalıdır."),
  unitPrice: z.number().nonnegative("Birim fiyat negatif olamaz."),
  lineTotal: z.number().nonnegative(),
  vatRate: z.number().min(0).max(1),
  vatAmount: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  clientCompanyId: z.string().min(1, "Müşteri şirketi gerekli."),
  externalId: z.string().optional(),
  type: z.enum(["SATIŞ", "ALIŞ"]),
  issueDate: z.string().min(1, "Düzenleme tarihi gerekli."),
  dueDate: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().default("TRY"),
  taxAmount: z.number().nonnegative(),
  netAmount: z.number().optional(),
  counterpartyName: z.string().optional(),
  counterpartyTaxNumber: z.string().optional(),
  status: z.enum(["taslak", "kesildi", "iptal", "muhasebeleştirilmiş"]).default("taslak"),
  lines: z.array(invoiceLineSchema).min(1, "En az bir fatura satırı gerekli."),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const defaultClientId = searchParams.get("clientCompanyId") || undefined;

  const { data: clientsData } = useQuery({
    queryKey: ["clientCompanies"],
    queryFn: () => listClientCompanies({ pageSize: 100 }),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      type: "SATIŞ",
      currency: "TRY",
      status: "taslak",
      clientCompanyId: defaultClientId || "",
      issueDate: new Date().toISOString().split("T")[0],
      totalAmount: 0,
      taxAmount: 0,
      lines: [
        {
          lineNumber: 1,
          description: "",
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          vatRate: 0.18,
          vatAmount: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");

  // Calculate totals when lines change
  const calculateTotals = () => {
    // Use getValues to get current form values synchronously
    const currentLines = getValues("lines");
    let totalAmount = 0;
    let taxAmount = 0;

    currentLines.forEach((line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const vatRate = Number(line.vatRate) || 0;
      
      const lineTotal = quantity * unitPrice;
      const lineVat = lineTotal * vatRate;
      
      totalAmount += lineTotal + lineVat;
      taxAmount += lineVat;
    });

    setValue("totalAmount", totalAmount, { shouldValidate: false, shouldDirty: false });
    setValue("taxAmount", taxAmount, { shouldValidate: false, shouldDirty: false });
    setValue("netAmount", totalAmount - taxAmount, { shouldValidate: false, shouldDirty: false });
  };

  // Recalculate totals whenever lines change
  useEffect(() => {
    calculateTotals();
  }, [watchedLines]);

  const updateLineTotal = (index: number) => {
    // Use getValues to get current form values synchronously
    const currentLines = getValues("lines");
    const line = currentLines[index];
    
    const quantity = Number(line?.quantity) || 0;
    const unitPrice = Number(line?.unitPrice) || 0;
    const vatRate = Number(line?.vatRate) || 0;
    
    const lineTotal = quantity * unitPrice;
    const vatAmount = lineTotal * vatRate;

    setValue(`lines.${index}.lineTotal`, lineTotal, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.vatAmount`, vatAmount, { shouldValidate: false, shouldDirty: false });
    
    // Recalculate totals after a brief delay to ensure form state is updated
    setTimeout(() => calculateTotals(), 10);
  };

  const updateFromRowTotal = (index: number, rowTotal: number) => {
    // When user edits Row Total directly, calculate unit price
    const currentLines = getValues("lines");
    const line = currentLines[index];
    
    const quantity = Number(line?.quantity) || 1; // Default to 1 if 0 to avoid division by 0
    const vatRate = Number(line?.vatRate) || 0;
    
    // Calculate unit price from row total and quantity
    const unitPrice = quantity > 0 ? rowTotal / quantity : 0;
    const vatAmount = rowTotal * vatRate;

    setValue(`lines.${index}.unitPrice`, unitPrice, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.lineTotal`, rowTotal, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.vatAmount`, vatAmount, { shouldValidate: false, shouldDirty: false });
    
    // Recalculate totals
    setTimeout(() => calculateTotals(), 10);
  };

  const mutation = useMutation({
    mutationFn: (data: InvoiceForm) => {
      const selectedClient = clientsData?.data?.data?.find((c: any) => c.id === data.clientCompanyId);
      return createInvoice({
        ...data,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        externalId: data.externalId || null,
        netAmount: data.netAmount || null,
        counterpartyName: data.counterpartyName || null,
        counterpartyTaxNumber: data.counterpartyTaxNumber || null,
        source: "manual" as const,
        clientCompanyName: selectedClient?.name || null,
        lines: data.lines.map((line, idx) => ({
          ...line,
          lineNumber: idx + 1,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      router.push("/faturalar");
    },
    onError: (err: Error) => {
      setError(err.message || "Fatura oluşturulurken bir hata oluştu.");
    },
  });

  const onSubmit = (data: InvoiceForm) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px" }}>
      <h1 style={{ marginBottom: "24px" }}>Yeni Fatura</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {error && (
          <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label htmlFor="clientCompanyId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Müşteri Şirketi *
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
            {errors.clientCompanyId && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>
                {errors.clientCompanyId.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="externalId" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Fatura No
            </label>
            <input
              id="externalId"
              {...register("externalId")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <div>
            <label htmlFor="type" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Tür *
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
              <option value="SATIŞ">Satış</option>
              <option value="ALIŞ">Alış</option>
            </select>
          </div>

          <div>
            <label htmlFor="issueDate" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Düzenleme Tarihi *
            </label>
            <input
              id="issueDate"
              type="date"
              {...register("issueDate")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.issueDate && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.issueDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="dueDate" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Vade Tarihi
            </label>
            <input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <div>
            <label htmlFor="currency" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Para Birimi
            </label>
            <select
              id="currency"
              {...register("currency")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <label htmlFor="counterpartyName" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Alıcı / Satıcı Adı
            </label>
            <input
              id="counterpartyName"
              {...register("counterpartyName")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="counterpartyTaxNumber"
              style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
            >
              Alıcı / Satıcı Vergi Numarası
            </label>
            <input
              id="counterpartyTaxNumber"
              {...register("counterpartyTaxNumber")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <div>
            <label htmlFor="status" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Durum
            </label>
            <select
              id="status"
              {...register("status")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              <option value="taslak">Taslak</option>
              <option value="kesildi">Kesildi</option>
              <option value="iptal">İptal</option>
              <option value="muhasebeleştirilmiş">Muhasebeleştirilmiş</option>
            </select>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Fatura Satırları</h2>
            <button
              type="button"
              onClick={() => {
                append({
                  lineNumber: fields.length + 1,
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  lineTotal: 0,
                  vatRate: 0.18,
                  vatAmount: 0,
                });
                // calculateTotals will be called by useEffect
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.success,
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
                <th style={{ padding: "12px", textAlign: "left" }}>Açıklama</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Miktar</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Birim Fiyat</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Satır Toplamı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>KDV Oranı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>KDV Tutarı</th>
                <th style={{ padding: "12px", textAlign: "left" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} style={{ borderBottom: "1px solid #eee" }}>
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
                    <input
                      type="number"
                      step="0.001"
                      {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`lines.${index}.quantity`).onChange(e);
                        updateLineTotal(index);
                      }}
                      style={{
                        width: "100px",
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`lines.${index}.unitPrice`).onChange(e);
                        updateLineTotal(index);
                      }}
                      style={{
                        width: "120px",
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.lineTotal`, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`lines.${index}.lineTotal`).onChange(e);
                        const rowTotal = Number(e.target.value) || 0;
                        updateFromRowTotal(index, rowTotal);
                      }}
                      style={{
                        width: "120px",
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <select
                      {...register(`lines.${index}.vatRate`, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`lines.${index}.vatRate`).onChange(e);
                        updateLineTotal(index);
                      }}
                      style={{
                        width: "100px",
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      <option value="0">%0</option>
                      <option value="0.01">%1</option>
                      <option value="0.10">%10</option>
                      <option value="0.18">%18</option>
                      <option value="0.20">%20</option>
                    </select>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.vatAmount`, { valueAsNumber: true })}
                      readOnly
                      style={{
                        width: "120px",
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        backgroundColor: colors.gray[100],
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          remove(index);
                          // calculateTotals will be called by useEffect
                        }}
                        style={{
                          padding: "4px 8px",
                          color: colors.danger,
                          border: `1px solid ${colors.danger}`,
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
              ))}
            </tbody>
          </table>

          {errors.lines && (
            <p style={{ color: "#c33", fontSize: "14px", marginBottom: "16px" }}>{errors.lines.message}</p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px", backgroundColor: colors.gray[100], borderRadius: borderRadius.sm }}>
          <div>
            <strong>Toplam Tutar:</strong>{" "}
            {watch("totalAmount")?.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}{" "}
            {watch("currency")}
          </div>
          <div>
            <strong>KDV Tutarı:</strong>{" "}
            {watch("taxAmount")?.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}{" "}
            {watch("currency")}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Link
            href="/faturalar"
            style={{
              padding: "8px 16px",
              backgroundColor: colors.gray[100],
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
            disabled={isSubmitting}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}

