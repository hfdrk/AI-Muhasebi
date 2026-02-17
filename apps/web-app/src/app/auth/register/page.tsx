"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { register as registerApi } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { colors, spacing, borderRadius, shadows, transitions, typography } from "@/styles/design-system";
import { emailValidator } from "@/utils/email-validation";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/contexts/ThemeContext";

const registerSchema = z.object({
  user: z.object({
    email: emailValidator,
    password: z.string().min(12, "Şifre en az 12 karakter olmalıdır."),
    fullName: z.string().min(1, "Ad soyad gerekli."),
  }),
  tenant: z.object({
    name: z.string().min(1, "Ofis adı gerekli."),
    slug: z.string().min(1, "Ofis kısa adı gerekli.").regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullanılabilir."),
    taxNumber: z.string().optional(),
    phone: z.string().optional(),
    email: emailValidator.optional().or(z.literal("")),
    address: z.string().optional(),
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { themeColors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterForm) => registerApi(data),
    onSuccess: () => {
      router.push("/anasayfa");
    },
    onError: (err: any) => {
      let errorMessage: string = "Kayıt olurken bir hata oluştu.";
      try {
        if (typeof err === "string") {
          errorMessage = err;
        } else if (err && typeof err === "object") {
          if (err.message && typeof err.message === "string") {
            errorMessage = err.message;
          } else if (err.error && typeof err.error === "object" && err.error.message && typeof err.error.message === "string") {
            errorMessage = err.error.message;
          } else if (err.error && typeof err.error === "string") {
            errorMessage = err.error;
          } else if (err.response?.data?.error?.message && typeof err.response.data.error.message === "string") {
            errorMessage = err.response.data.error.message;
          }
        }
      } catch {
        errorMessage = "Kayıt olurken bir hata oluştu.";
      }
      setError(errorMessage);
    },
  });

  const onSubmit = (data: RegisterForm) => {
    setError(null);
    mutation.mutate(data);
  };

  const handleNextStep = async () => {
    const valid = await trigger(["user.fullName", "user.email", "user.password"]);
    if (valid) {
      setStep(2);
    }
  };

  if (!mounted) {
    return null;
  }

  const inputStyle = (field: string, hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: `${spacing.md} ${spacing.lg}`,
    paddingLeft: `calc(${spacing.xl} + ${spacing.md} + 24px)`,
    border: `2px solid ${hasError ? colors.danger : focusedField === field ? colors.primary : themeColors.border}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    backgroundColor: focusedField === field ? colors.primaryLighter + "20" : themeColors.white,
    color: themeColors.text.primary,
    transition: `all ${transitions.normal} ease`,
    outline: "none",
    boxShadow: focusedField === field ? `0 0 0 3px ${colors.primary}15` : "none",
    boxSizing: "border-box" as const,
  });

  const simpleInputStyle = (field: string, hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: `${spacing.md} ${spacing.lg}`,
    border: `2px solid ${hasError ? colors.danger : focusedField === field ? colors.primary : themeColors.border}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    backgroundColor: focusedField === field ? colors.primaryLighter + "20" : themeColors.white,
    color: themeColors.text.primary,
    transition: `all ${transitions.normal} ease`,
    outline: "none",
    boxShadow: focusedField === field ? `0 0 0 3px ${colors.primary}15` : "none",
    boxSizing: "border-box" as const,
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: themeColors.text.primary,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${themeColors.white} 50%, ${themeColors.gray[50]} 100%)`,
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

      {/* Main Content */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
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
              width: "72px",
              height: "72px",
              borderRadius: borderRadius.xl,
              background: colors.gradients.primary,
              marginBottom: spacing.md,
              boxShadow: shadows.lg,
            }}
          >
            <Icon name="BarChart3" size={36} color={themeColors.white} />
          </div>
          <h1
            style={{
              margin: 0,
              marginBottom: spacing.xs,
              fontSize: typography.fontSize["2xl"],
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
              color: themeColors.text.secondary,
              fontSize: typography.fontSize.base,
            }}
          >
            Yeni ofis hesabı oluşturun
          </p>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                backgroundColor: step >= 1 ? colors.primary : themeColors.gray[200],
                color: step >= 1 ? colors.white : themeColors.text.secondary,
                transition: `all ${transitions.normal} ease`,
              }}
            >
              {step > 1 ? <Icon name="Check" size={16} color={themeColors.white} /> : "1"}
            </div>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: step === 1 ? typography.fontWeight.semibold : typography.fontWeight.normal,
                color: step === 1 ? colors.primary : themeColors.text.secondary,
              }}
            >
              Kullanıcı
            </span>
          </div>
          <div
            style={{
              width: "40px",
              height: "2px",
              backgroundColor: step >= 2 ? colors.primary : themeColors.gray[200],
              transition: `all ${transitions.normal} ease`,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                backgroundColor: step >= 2 ? colors.primary : themeColors.gray[200],
                color: step >= 2 ? colors.white : themeColors.text.secondary,
                transition: `all ${transitions.normal} ease`,
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: step === 2 ? typography.fontWeight.semibold : typography.fontWeight.normal,
                color: step === 2 ? colors.primary : themeColors.text.secondary,
              }}
            >
              Ofis
            </span>
          </div>
        </div>

        {/* Form Card */}
        <div
          style={{
            backgroundColor: themeColors.white,
            borderRadius: borderRadius.xl,
            padding: spacing.xxl,
            boxShadow: shadows.xl,
            border: `1px solid ${themeColors.border}`,
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
                <Icon name="AlertCircle" size={20} color={colors.dangerDark} />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: User Info */}
            {step === 1 && (
              <>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" style={labelStyle}>
                    Ad Soyad
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      id="fullName"
                      {...register("user.fullName")}
                      onFocus={() => setFocusedField("fullName")}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle("fullName", !!errors.user?.fullName)}
                      placeholder="Ahmet Yılmaz"
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                      }}
                    >
                      <Icon name="User" size={18} color={focusedField === "fullName" ? colors.primary : themeColors.text.secondary} />
                    </span>
                  </div>
                  {errors.user?.fullName && (
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
                      <Icon name="XCircle" size={14} color={colors.danger} />
                      <span>
                        {typeof errors.user.fullName.message === "string"
                          ? errors.user.fullName.message
                          : String(errors.user.fullName.message || "Geçersiz değer")}
                      </span>
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" style={labelStyle}>
                    E-posta Adresi
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      id="email"
                      type="email"
                      {...register("user.email")}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle("email", !!errors.user?.email)}
                      placeholder="ornek@email.com"
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                      }}
                    >
                      <Icon name="Mail" size={18} color={focusedField === "email" ? colors.primary : themeColors.text.secondary} />
                    </span>
                  </div>
                  {errors.user?.email && (
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
                      <Icon name="XCircle" size={14} color={colors.danger} />
                      <span>
                        {typeof errors.user.email.message === "string"
                          ? errors.user.email.message
                          : String(errors.user.email.message || "Geçersiz e-posta")}
                      </span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" style={labelStyle}>
                    Şifre
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      id="password"
                      type="password"
                      {...register("user.password")}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle("password", !!errors.user?.password)}
                      placeholder="••••••••••••"
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                      }}
                    >
                      <Icon name="Lock" size={18} color={focusedField === "password" ? colors.primary : themeColors.text.secondary} />
                    </span>
                  </div>
                  {errors.user?.password && (
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
                      <Icon name="XCircle" size={14} color={colors.danger} />
                      <span>
                        {typeof errors.user.password.message === "string"
                          ? errors.user.password.message
                          : String(errors.user.password.message || "Geçersiz şifre")}
                      </span>
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: themeColors.text.muted,
                      marginTop: spacing.xs,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <Icon name="Info" size={12} color={themeColors.text.muted} />
                    En az 12 karakter, büyük harf, küçük harf, rakam ve özel karakter
                  </p>
                </div>

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={handleNextStep}
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    background: colors.gradients.primary,
                    color: colors.white,
                    border: "none",
                    borderRadius: borderRadius.lg,
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: "pointer",
                    transition: `all ${transitions.normal} ease`,
                    boxShadow: shadows.md,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing.sm,
                    marginTop: spacing.sm,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = shadows.lg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = shadows.md;
                  }}
                >
                  <span>Devam Et</span>
                  <Icon name="ArrowRight" size={20} color={themeColors.white} />
                </button>
              </>
            )}

            {/* Step 2: Office Info */}
            {step === 2 && (
              <>
                {/* Office Name */}
                <div>
                  <label htmlFor="tenantName" style={labelStyle}>
                    Ofis Adı
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      id="tenantName"
                      {...register("tenant.name")}
                      onFocus={() => setFocusedField("tenantName")}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle("tenantName", !!errors.tenant?.name)}
                      placeholder="ABC Mali Müşavirlik"
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                      }}
                    >
                      <Icon name="Building2" size={18} color={focusedField === "tenantName" ? colors.primary : themeColors.text.secondary} />
                    </span>
                  </div>
                  {errors.tenant?.name && (
                    <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs, display: "flex", alignItems: "center", gap: spacing.xs }}>
                      <Icon name="XCircle" size={14} color={colors.danger} />
                      <span>{typeof errors.tenant.name.message === "string" ? errors.tenant.name.message : String(errors.tenant.name.message || "Geçersiz ofis adı")}</span>
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label htmlFor="tenantSlug" style={labelStyle}>
                    Ofis Kısa Adı (URL)
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      id="tenantSlug"
                      {...register("tenant.slug")}
                      onFocus={() => setFocusedField("slug")}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle("slug", !!errors.tenant?.slug)}
                      placeholder="abc-mali-musavirlik"
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                      }}
                    >
                      <Icon name="Link" size={18} color={focusedField === "slug" ? colors.primary : themeColors.text.secondary} />
                    </span>
                  </div>
                  {errors.tenant?.slug && (
                    <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs, display: "flex", alignItems: "center", gap: spacing.xs }}>
                      <Icon name="XCircle" size={14} color={colors.danger} />
                      <span>{typeof errors.tenant.slug.message === "string" ? errors.tenant.slug.message : String(errors.tenant.slug.message || "Geçersiz ofis kısa adı")}</span>
                    </p>
                  )}
                  <p style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: spacing.xs }}>
                    Sadece küçük harf, rakam ve tire kullanılabilir.
                  </p>
                </div>

                {/* Tax Number & Phone Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md }}>
                  <div>
                    <label htmlFor="taxNumber" style={labelStyle}>
                      Vergi No (VKN/TCKN)
                    </label>
                    <input
                      id="taxNumber"
                      {...register("tenant.taxNumber")}
                      onFocus={() => setFocusedField("taxNumber")}
                      onBlur={() => setFocusedField(null)}
                      style={simpleInputStyle("taxNumber")}
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" style={labelStyle}>
                      Telefon
                    </label>
                    <input
                      id="phone"
                      {...register("tenant.phone")}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField(null)}
                      style={simpleInputStyle("phone")}
                      placeholder="0212 555 00 00"
                    />
                  </div>
                </div>

                {/* Office Email */}
                <div>
                  <label htmlFor="tenantEmail" style={labelStyle}>
                    Ofis E-posta
                  </label>
                  <input
                    id="tenantEmail"
                    type="email"
                    {...register("tenant.email")}
                    onFocus={() => setFocusedField("tenantEmail")}
                    onBlur={() => setFocusedField(null)}
                    style={simpleInputStyle("tenantEmail")}
                    placeholder="info@abc-mali.com"
                  />
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" style={labelStyle}>
                    Adres
                  </label>
                  <textarea
                    id="address"
                    {...register("tenant.address")}
                    rows={2}
                    onFocus={() => setFocusedField("address")}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...simpleInputStyle("address"),
                      resize: "vertical" as const,
                    }}
                    placeholder="İstanbul, Türkiye"
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.sm }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      backgroundColor: "transparent",
                      color: themeColors.text.primary,
                      border: `2px solid ${themeColors.border}`,
                      borderRadius: borderRadius.lg,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.medium,
                      cursor: "pointer",
                      transition: `all ${transitions.normal} ease`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: spacing.xs,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = themeColors.gray[50];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon name="ArrowLeft" size={18} />
                    <span>Geri</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      padding: spacing.md,
                      background: isSubmitting ? themeColors.gray[400] : colors.gradients.primary,
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
                        <span style={{ display: "inline-flex", animation: "spin 1s linear infinite" }}>
                          <Icon name="Loader2" size={20} color={themeColors.white} />
                        </span>
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="CheckCircle" size={20} color={themeColors.white} />
                        <span>Kaydı Tamamla</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
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
            <div style={{ flex: 1, height: "1px", backgroundColor: themeColors.border }} />
            <span style={{ color: themeColors.text.secondary, fontSize: typography.fontSize.sm }}>veya</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: themeColors.border }} />
          </div>

          {/* Login Link */}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                marginBottom: spacing.sm,
                fontSize: typography.fontSize.sm,
                color: themeColors.text.secondary,
              }}
            >
              Zaten hesabınız var mı?
            </p>
            <Link
              href="/auth/login"
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
            >
              <Icon name="LogIn" size={16} />
              <span>Giriş Yap</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: spacing.lg }}>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.xs,
              color: themeColors.text.muted,
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
