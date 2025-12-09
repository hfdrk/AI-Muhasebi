"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteUser } from "@repo/api-client";
import { useState } from "react";

const inviteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  role: z.enum(["TenantOwner", "Accountant", "Staff", "ReadOnly"]),
  name: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

const ROLE_LABELS = {
  TenantOwner: "Ofis Sahibi",
  Accountant: "Muhasebeci",
  Staff: "Personel",
  ReadOnly: "Sadece Görüntüleme",
};

interface InviteUserModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteUserModal({ tenantId, isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (!tenantId) {
    console.error("InviteUserModal: tenantId is required");
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
      role: "Staff",
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
      console.error("Invite user error:", err);
      const errorMessage =
        err?.message ||
        err?.error?.message ||
        (typeof err === "string" ? err : "Kullanıcı davet edilirken bir hata oluştu.");
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
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          width: "100%",
          maxWidth: "500px",
          margin: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px" }}>Kullanıcı Davet Et</h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Ad Soyad
            </label>
            <input
              id="name"
              type="text"
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
            <label htmlFor="role" style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
              Rol
            </label>
            <select
              id="role"
              {...register("role")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p style={{ color: "#c33", fontSize: "14px", marginTop: "4px" }}>{errors.role.message}</p>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isSubmitting}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: mutation.isPending || isSubmitting ? "not-allowed" : "pointer",
                opacity: mutation.isPending || isSubmitting ? 0.6 : 1,
              }}
            >
              {mutation.isPending || isSubmitting ? "Gönderiliyor..." : "Davet Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

