"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { login } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre gerekli."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => login(data),
    onSuccess: (response) => {
      // Decode JWT token to get user role
      try {
        const token = response.data.accessToken;
        if (token) {
          // JWT tokens have 3 parts: header.payload.signature
          const payload = JSON.parse(atob(token.split(".")[1]));
          const roles = payload.roles || [];
          
          // Redirect ReadOnly users to client portal, others to accountant dashboard
          if (roles.includes("ReadOnly")) {
            router.push("/client/dashboard");
          } else {
            router.push("/anasayfa");
          }
        } else {
          // Fallback to accountant dashboard if no token
          router.push("/anasayfa");
        }
      } catch (error) {
        // If token decoding fails, fallback to accountant dashboard
        console.error("Failed to decode token:", error);
        router.push("/anasayfa");
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Giriş yapılırken bir hata oluştu.");
    },
  });

  const onSubmit = (data: LoginForm) => {
    setError(null);
    mutation.mutate(data);
  };

  // Prevent hydration mismatch by not rendering during SSR
  if (!mounted) {
    return null;
  }

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

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <Link
              href="/auth/forgot-password"
              style={{ color: "#0066cc", textDecoration: "none", fontSize: "14px" }}
            >
              Şifremi Unuttum?
            </Link>
            <div style={{ marginTop: "8px", paddingTop: "16px", borderTop: "1px solid #eee", width: "100%" }}>
              <p style={{ textAlign: "center", fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                Hesabınız yok mu?
              </p>
              <Link
                href="/auth/register"
                style={{
                  display: "block",
                  textAlign: "center",
                  color: "#0066cc",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Yeni Ofis Kaydı Oluştur
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

