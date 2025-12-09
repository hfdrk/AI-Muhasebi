"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { register } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const registerSchema = z.object({
  user: z.object({
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),
    password: z.string().min(12, "Şifre en az 12 karakter olmalıdır."),
    fullName: z.string().min(1, "Ad soyad gerekli."),
  }),
  tenant: z.object({
    name: z.string().min(1, "Ofis adı gerekli."),
    slug: z.string().min(1, "Ofis kısa adı gerekli.").regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullanılabilir."),
    taxNumber: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal("")),
    address: z.string().optional(),
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterForm) => register(data),
    onSuccess: () => {
      router.push("/anasayfa");
    },
    onError: (err: Error) => {
      setError(err.message || "Kayıt olurken bir hata oluştu.");
    },
  });

  const onSubmit = (data: RegisterForm) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Yeni Ofis Kaydı</h1>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <fieldset style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <legend style={{ fontWeight: "600", padding: "0 8px" }}>Kullanıcı Bilgileri</legend>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="fullName" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Ad Soyad
              </label>
              <input
                id="fullName"
                {...register("user.fullName")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
              {errors.user?.fullName && (
                <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.user.fullName.message}</p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="email" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                E-posta
              </label>
              <input
                id="email"
                type="email"
                {...register("user.email")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
              {errors.user?.email && (
                <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.user.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Şifre
              </label>
              <input
                id="password"
                type="password"
                {...register("user.password")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
              {errors.user?.password && (
                <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.user.password.message}</p>
              )}
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                En az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter içermelidir.
              </p>
            </div>
          </fieldset>

          <fieldset style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "4px" }}>
            <legend style={{ fontWeight: "600", padding: "0 8px" }}>Ofis Bilgileri</legend>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="tenantName" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Ofis Adı
              </label>
              <input
                id="tenantName"
                {...register("tenant.name")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
              {errors.tenant?.name && (
                <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.tenant.name.message}</p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="tenantSlug" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Ofis Kısa Adı (URL)
              </label>
              <input
                id="tenantSlug"
                {...register("tenant.slug")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
              {errors.tenant?.slug && (
                <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.tenant.slug.message}</p>
              )}
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Sadece küçük harf, rakam ve tire kullanılabilir.
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="taxNumber" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Vergi Numarası (VKN/TCKN)
              </label>
              <input
                id="taxNumber"
                {...register("tenant.taxNumber")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="phone" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Telefon
              </label>
              <input
                id="phone"
                {...register("tenant.phone")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="tenantEmail" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                E-posta
              </label>
              <input
                id="tenantEmail"
                type="email"
                {...register("tenant.email")}
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
              <label htmlFor="address" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                Adres
              </label>
              <textarea
                id="address"
                {...register("tenant.address")}
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
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydı Tamamla"}
          </button>
        </form>
      </div>
    </div>
  );
}

