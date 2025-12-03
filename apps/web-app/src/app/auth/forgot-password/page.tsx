"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@repo/api-client";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordForm) => forgotPassword(data),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || "Bir hata oluştu.");
    },
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    setError(null);
    mutation.mutate(data);
  };

  if (success) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ marginBottom: "24px" }}>Şifre Sıfırlama Talebi</h1>
          <div style={{ padding: "16px", backgroundColor: "#efe", color: "#3a3", borderRadius: "4px" }}>
            Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderdik.
          </div>
          <a href="/auth/login" style={{ display: "inline-block", marginTop: "16px", color: "#0066cc", textDecoration: "none" }}>
            Giriş sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Şifreni mi unuttun?</h1>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              E-posta
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
            {errors.email && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.email.message}</p>
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
            {isSubmitting ? "Gönderiliyor..." : "Şifre sıfırlama bağlantısı gönder"}
          </button>

          <a
            href="/auth/login"
            style={{ textAlign: "center", color: "#0066cc", textDecoration: "none" }}
          >
            Giriş sayfasına dön
          </a>
        </form>
      </div>
    </div>
  );
}

