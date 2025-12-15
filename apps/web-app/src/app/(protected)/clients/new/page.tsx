"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientCompany } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { colors, spacing, borderRadius } from "@/styles/design-system";

const clientCompanySchema = z.object({
  name: z.string().min(1, "Şirket adı gerekli."),
  legalType: z.enum(["Şahıs", "Limited", "Anonim", "Kollektif", "Komandit"]),
  taxNumber: z.string().min(1, "Vergi numarası gerekli."),
  tradeRegistryNumber: z.string().optional(),
  sector: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal("")),
  address: z.string().optional(),
  startDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ClientCompanyForm = z.infer<typeof clientCompanySchema>;

export default function NewClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientCompanyForm>({
    resolver: zodResolver(clientCompanySchema),
    defaultValues: {
      legalType: "Limited",
      isActive: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ClientCompanyForm) =>
      createClientCompany({
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        tradeRegistryNumber: data.tradeRegistryNumber || null,
        sector: data.sector || null,
        contactPersonName: data.contactPersonName || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        address: data.address || null,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clientCompanies"] });
      router.push(`/clients/${data.data.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || "Şirket oluşturulurken bir hata oluştu.");
    },
  });

  const onSubmit = (data: ClientCompanyForm) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px" }}>
      <h1 style={{ marginBottom: "24px" }}>Yeni Müşteri Şirketi</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
            {error}
            {error.includes("limitine ulaşıldı") && (
              <div style={{ marginTop: "8px" }}>
                <Link
                  href="/ayarlar/abonelik"
                  style={{
                    color: "#3b82f6",
                    textDecoration: "underline",
                    fontSize: "14px",
                  }}
                >
                  Abonelik & Kullanım sayfasına git
                </Link>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="name" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Şirket Adı *
          </label>
          <input
            id="name"
            {...register("name")}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
          {errors.name && (
            <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="legalType" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Şirket Türü *
          </label>
          <select
            id="legalType"
            {...register("legalType")}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          >
            <option value="Şahıs">Şahıs</option>
            <option value="Limited">Limited</option>
            <option value="Anonim">Anonim</option>
            <option value="Kollektif">Kollektif</option>
            <option value="Komandit">Komandit</option>
          </select>
          {errors.legalType && (
            <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.legalType.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="taxNumber" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Vergi Numarası (VKN/TCKN) *
          </label>
          <input
            id="taxNumber"
            {...register("taxNumber")}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
          {errors.taxNumber && (
            <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.taxNumber.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tradeRegistryNumber" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Ticaret Sicil No
          </label>
          <input
            id="tradeRegistryNumber"
            {...register("tradeRegistryNumber")}
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
          <label htmlFor="sector" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Sektör
          </label>
          <input
            id="sector"
            {...register("sector")}
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
          <label htmlFor="contactPersonName" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            İlgili Kişi Ad Soyad
          </label>
          <input
            id="contactPersonName"
            {...register("contactPersonName")}
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
          <label htmlFor="contactPhone" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            İlgili Kişi Telefon
          </label>
          <input
            id="contactPhone"
            type="tel"
            {...register("contactPhone")}
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
          <label htmlFor="contactEmail" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            İlgili Kişi E-posta
          </label>
          <input
            id="contactEmail"
            type="email"
            {...register("contactEmail")}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
          {errors.contactEmail && (
            <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.contactEmail.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="address" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Adres
          </label>
          <textarea
            id="address"
            {...register("address")}
            rows={3}
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

        <div>
          <label htmlFor="startDate" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Başlangıç Tarihi
          </label>
          <input
            id="startDate"
            type="date"
            {...register("startDate")}
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
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" {...register("isActive")} />
            <span>Aktif</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Link
            href="/musteriler"
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

