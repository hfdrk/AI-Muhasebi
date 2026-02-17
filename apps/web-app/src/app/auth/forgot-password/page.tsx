"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@repo/api-client";
import { useState } from "react";
import { emailValidator } from "@/utils/email-validation";
import { colors, spacing, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const forgotPasswordSchema = z.object({
  email: emailValidator,
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { themeColors } = useTheme();

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
          <div style={{ padding: spacing.md, backgroundColor: colors.successLight, color: colors.success, borderRadius: borderRadius.sm }}>
            Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderdik.
          </div>
          <a href="/auth/login" style={{ display: "inline-block", marginTop: spacing.md, color: colors.primary, textDecoration: "none" }}>
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

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: colors.dangerLight, color: colors.danger, borderRadius: borderRadius.sm }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              E-posta
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              style={{
                width: "100%",
                padding: `${spacing.sm} 12px`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
                color: themeColors.text.primary,
                backgroundColor: themeColors.white,
              }}
            />
            {errors.email && (
              <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px",
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: borderRadius.sm,
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
            style={{ textAlign: "center", color: colors.primary, textDecoration: "none" }}
          >
            Giriş sayfasına dön
          </a>
        </form>
      </div>
    </div>
  );
}

