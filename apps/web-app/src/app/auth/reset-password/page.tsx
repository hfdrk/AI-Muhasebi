"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@repo/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(12, "Şifre en az 12 karakter olmalıdır."),
    confirmPassword: z.string().min(1, "Şifre tekrarı gerekli."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordForm) => {
      if (!token) {
        throw new Error("Token bulunamadı.");
      }
      return resetPassword({ token, password: data.password });
    },
    onSuccess: () => {
      router.push("/auth/login?message=Şifreniz başarıyla güncellendi.");
    },
    onError: (err: Error) => {
      setError(err.message || "Şifre sıfırlanırken bir hata oluştu.");
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    setError(null);
    mutation.mutate(data);
  };

  if (!token) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ marginBottom: "24px" }}>Geçersiz Bağlantı</h1>
          <p style={{ marginBottom: "16px" }}>Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.</p>
          <a href="/auth/forgot-password" style={{ color: "#0066cc", textDecoration: "none" }}>
            Yeni şifre sıfırlama talebi oluştur
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Yeni Şifre Belirleme</h1>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Yeni şifre
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.password && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.password.message}</p>
            )}
            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              En az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter içermelidir.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Yeni şifre (tekrar)
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.confirmPassword && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.confirmPassword.message}</p>
            )}
          </div>

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
            {isSubmitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}

