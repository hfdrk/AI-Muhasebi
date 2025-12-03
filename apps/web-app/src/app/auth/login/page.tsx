"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { login } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre gerekli."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => login(data),
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (err: Error) => {
      setError(err.message || "Giriş yapılırken bir hata oluştu.");
    },
  });

  const onSubmit = (data: LoginForm) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Giriş Yap</h1>

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

          <div>
            <label htmlFor="password" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Şifre
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
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <a
            href="/auth/forgot-password"
            style={{ textAlign: "center", color: "#0066cc", textDecoration: "none" }}
          >
            Şifremi Unuttum?
          </a>
        </form>
      </div>
    </div>
  );
}

