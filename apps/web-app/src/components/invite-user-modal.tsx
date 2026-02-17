"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteUser } from "@repo/api-client";
import { useState } from "react";
import { colors, spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const inviteSchema = z.object({
  email: z.string().email("Ge\u00e7erli bir e-posta adresi giriniz."),
  role: z.enum(["TenantOwner", "ReadOnly"]),
  name: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

const ROLE_LABELS = {
  TenantOwner: "Muhasebeci", // Accountant - full access
  ReadOnly: "M\u00fc\u015fteri", // Customer - view-only access
};

interface InviteUserModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteUserModal({ tenantId, isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const { themeColors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (!tenantId) {
    if (process.env.NODE_ENV === "development") {
      console.error("InviteUserModal: tenantId is required");
    }
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: "ReadOnly",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InviteForm) => inviteUser(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantUsers", tenantId] });
      reset();
      setError(null);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: any) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Invite user error:", err);
      }
      const errorMessage =
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : "Kullan\u0131c\u0131 davet edilirken bir hata olu\u015ftu.");
      setError(errorMessage);
    },
  });

  const onSubmit = (data: InviteForm) => {
    setError(null);
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: themeColors.white,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          width: "100%",
          maxWidth: "500px",
          margin: spacing.md,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: spacing.md }}>Kullan\u0131c\u0131 Davet Et</h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {error && (
            <div style={{ padding: spacing.sm, backgroundColor: colors.dangerLight, color: colors.danger, borderRadius: borderRadius.sm }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" style={{ display: "block", marginBottom: spacing.xs, fontWeight: typography.fontWeight.medium }}>
              Ad Soyad
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              style={{
                width: "100%",
                padding: `${spacing.sm} ${spacing.sm}`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.base,
              }}
            />
            {errors.name && (
              <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" style={{ display: "block", marginBottom: spacing.xs, fontWeight: typography.fontWeight.medium }}>
              E-posta
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              style={{
                width: "100%",
                padding: `${spacing.sm} ${spacing.sm}`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.base,
              }}
            />
            {errors.email && (
              <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" style={{ display: "block", marginBottom: spacing.xs, fontWeight: typography.fontWeight.medium }}>
              Rol
            </label>
            <select
              id="role"
              {...register("role")}
              style={{
                width: "100%",
                padding: `${spacing.sm} ${spacing.sm}`,
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.base,
              }}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p style={{ color: colors.danger, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.role.message}</p>
            )}
          </div>

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: themeColors.gray[100],
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              \u0130ptal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isSubmitting}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: mutation.isPending || isSubmitting ? "not-allowed" : "pointer",
                opacity: mutation.isPending || isSubmitting ? 0.6 : 1,
              }}
            >
              {mutation.isPending || isSubmitting ? "G\u00f6nderiliyor..." : "Davet G\u00f6nder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
