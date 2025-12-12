"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { login } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";
import { emailValidator } from "@/utils/email-validation";

const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, "Şifre gerekli."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
          // Ensure token is stored in localStorage (login function should do this, but ensure it)
          if (typeof window !== "undefined") {
            localStorage.setItem("accessToken", token);
          }
          
          // JWT tokens have 3 parts: header.payload.signature
          const payload = JSON.parse(atob(token.split(".")[1]));
          const roles = payload.roles || [];
          
          console.log("[Login] Decoded token roles:", roles);
          console.log("[Login] Full payload:", payload);
          
          // Redirect ReadOnly users to client portal, others to accountant dashboard
          // Check for both "ReadOnly" and case variations
          const isReadOnly = roles.some((role: string) => 
            role === "ReadOnly" || role === "READ_ONLY" || role.toLowerCase() === "readonly"
          );
          
          if (isReadOnly) {
            console.log("[Login] Redirecting ReadOnly user to client dashboard");
            router.push("/client/dashboard");
          } else {
            console.log("[Login] Redirecting non-ReadOnly user to accountant dashboard");
            router.push("/anasayfa");
          }
        } else {
          // Fallback to accountant dashboard if no token
          console.warn("[Login] No token in response, redirecting to accountant dashboard");
          router.push("/anasayfa");
        }
      } catch (error) {
        // If token decoding fails, fallback to accountant dashboard
        console.error("[Login] Failed to decode token:", error);
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 50%, ${colors.gray[50]} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-20%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.info}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo/Brand Section */}
        <div style={{ textAlign: "center", marginBottom: spacing.xl }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              borderRadius: borderRadius.xl,
              background: colors.gradients.primary,
              marginBottom: spacing.lg,
              boxShadow: shadows.lg,
            }}
          >
            <span style={{ fontSize: "40px" }}>📊</span>
          </div>
          <h1
            style={{
              margin: 0,
              marginBottom: spacing.sm,
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              background: colors.gradients.primary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AI Muhasebi
          </h1>
          <p
            style={{
              margin: 0,
              color: colors.text.secondary,
              fontSize: typography.fontSize.base,
            }}
          >
            Hesabınıza giriş yapın
          </p>
        </div>

        {/* Login Form Card */}
        <div
          style={{
            backgroundColor: colors.white,
            borderRadius: borderRadius.xl,
            padding: spacing.xxl,
            boxShadow: shadows.xl,
            border: `1px solid ${colors.border}`,
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.dangerLight,
                  color: colors.dangerDark,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.danger}`,
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  animation: "slideDown 0.3s ease-out",
                }}
              >
                <span style={{ fontSize: "20px" }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                }}
              >
                E-posta Adresi
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    padding: `${spacing.md} ${spacing.lg}`,
                    paddingLeft: `calc(${spacing.xl} + ${spacing.md} + 24px)`,
                    border: `2px solid ${focusedField === "email" ? colors.primary : colors.border}`,
                    borderRadius: borderRadius.lg,
                    fontSize: typography.fontSize.base,
                    backgroundColor: focusedField === "email" ? colors.primaryLighter + "20" : colors.white,
                    transition: `all ${transitions.normal} ease`,
                    outline: "none",
                    boxShadow: focusedField === "email" ? `0 0 0 3px ${colors.primary}15` : "none",
                    overflowX: "auto",
                    overflowY: "hidden",
                    textOverflow: "unset",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                  placeholder="ornek@email.com"
                />
                <span
                  style={{
                    position: "absolute",
                    left: spacing.lg,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "18px",
                    color: focusedField === "email" ? colors.primary : colors.text.secondary,
                    transition: `color ${transitions.normal} ease`,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                  }}
                >
                  ✉️
                </span>
              </div>
              {errors.email && (
                <p
                  style={{
                    color: colors.danger,
                    fontSize: typography.fontSize.sm,
                    marginTop: spacing.xs,
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <span>❌</span>
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  Şifre
                </label>
                <Link
                  href="/auth/forgot-password"
                  style={{
                    color: colors.primary,
                    textDecoration: "none",
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    transition: `color ${transitions.normal} ease`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.primary;
                  }}
                >
                  Şifremi Unuttum?
                </Link>
              </div>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    padding: `${spacing.md} ${spacing.lg}`,
                    paddingLeft: `calc(${spacing.xl} + ${spacing.md} + 24px)`,
                    paddingRight: spacing.xl + spacing.md,
                    border: `2px solid ${focusedField === "password" ? colors.primary : colors.border}`,
                    borderRadius: borderRadius.lg,
                    fontSize: typography.fontSize.base,
                    backgroundColor: focusedField === "password" ? colors.primaryLighter + "20" : colors.white,
                    transition: `all ${transitions.normal} ease`,
                    outline: "none",
                    boxShadow: focusedField === "password" ? `0 0 0 3px ${colors.primary}15` : "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="••••••••"
                />
                <span
                  style={{
                    position: "absolute",
                    left: spacing.lg,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "18px",
                    color: focusedField === "password" ? colors.primary : colors.text.secondary,
                    transition: `color ${transitions.normal} ease`,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                  }}
                >
                  🔒
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: spacing.md,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: spacing.xs,
                    color: colors.text.secondary,
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: `color ${transitions.normal} ease`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.text.secondary;
                  }}
                  title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && (
                <p
                  style={{
                    color: colors.danger,
                    fontSize: typography.fontSize.sm,
                    marginTop: spacing.xs,
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <span>❌</span>
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: spacing.md,
                background: isSubmitting ? colors.gray[400] : colors.gradients.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.lg,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: `all ${transitions.normal} ease`,
                boxShadow: isSubmitting ? "none" : shadows.md,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.sm,
                marginTop: spacing.sm,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = shadows.lg;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = shadows.md;
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.md,
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>veya</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
          </div>

          {/* Register Link */}
          <div
            style={{
              textAlign: "center",
              padding: spacing.lg,
              backgroundColor: colors.gray[50],
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: spacing.sm,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}
            >
              Hesabınız yok mu?
            </p>
            <Link
              href="/auth/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing.xs,
                color: colors.primary,
                textDecoration: "none",
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                transition: `all ${transitions.normal} ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primaryDark;
                e.currentTarget.style.gap = spacing.sm;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.primary;
                e.currentTarget.style.gap = spacing.xs;
              }}
            >
              <span>Yeni Ofis Kaydı Oluştur</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: spacing.lg }}>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.xs,
              color: colors.text.muted,
            }}
          >
            © 2025 AI Muhasebi. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

