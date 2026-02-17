"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBankAccount, updateBankAccount, listBankAccounts } from "@repo/api-client";
import { useState } from "react";
import { colors, spacing, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Banka adı gerekli."),
  iban: z.string().min(1, "IBAN gerekli."),
  accountNumber: z.string().optional(),
  currency: z.string().default("TRY"),
  isPrimary: z.boolean().default(false),
});

type BankAccountForm = z.infer<typeof bankAccountSchema>;

interface BankAccountModalProps {
  clientCompanyId: string;
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BankAccountModal({
  clientCompanyId,
  accountId,
  isOpen,
  onClose,
}: BankAccountModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { themeColors } = useTheme();

  const { data: existingAccount } = useQuery({
    queryKey: ["bankAccount", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const accounts = await listBankAccounts(clientCompanyId);
      return accounts.data.find((a) => a.id === accountId) || null;
    },
    enabled: !!accountId && isOpen,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BankAccountForm>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      currency: "TRY",
      isPrimary: false,
    },
    values: existingAccount
      ? {
          bankName: existingAccount.bankName,
          iban: existingAccount.iban,
          accountNumber: existingAccount.accountNumber || "",
          currency: existingAccount.currency,
          isPrimary: existingAccount.isPrimary,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: BankAccountForm) =>
      createBankAccount(clientCompanyId, {
        ...data,
        accountNumber: data.accountNumber || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts", clientCompanyId] });
      reset();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Banka hesabı oluşturulurken bir hata oluştu.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BankAccountForm) =>
      updateBankAccount(clientCompanyId, accountId!, {
        ...data,
        accountNumber: data.accountNumber || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts", clientCompanyId] });
      reset();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Banka hesabı güncellenirken bir hata oluştu.");
    },
  });

  const onSubmit = (data: BankAccountForm) => {
    setError(null);
    if (accountId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
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
          margin: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px" }}>
          {accountId ? "Banka Hesabı Düzenle" : "Yeni Banka Hesabı"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {error && (
            <div style={{ padding: "12px", backgroundColor: colors.dangerLight, color: colors.danger, borderRadius: borderRadius.sm }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="bankName" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              Banka Adı *
            </label>
            <input
              id="bankName"
              {...register("bankName")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
              }}
            />
            {errors.bankName && (
              <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.bankName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="iban" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              IBAN *
            </label>
            <input
              id="iban"
              {...register("iban")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
              }}
            />
            {errors.iban && (
              <p style={{ color: colors.danger, fontSize: "14px", marginTop: spacing.xs }}>{errors.iban.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="accountNumber" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              Hesap Numarası
            </label>
            <input
              id="accountNumber"
              {...register("accountNumber")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
              }}
            />
          </div>

          <div>
            <label htmlFor="currency" style={{ display: "block", marginBottom: spacing.xs, fontWeight: "500" }}>
              Para Birimi
            </label>
            <select
              id="currency"
              {...register("currency")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: "16px",
              }}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <input type="checkbox" {...register("isPrimary")} />
              <span>Birincil Hesap</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: themeColors.gray[50],
                border: `1px solid ${themeColors.border}`,
                borderRadius: borderRadius.sm,
                cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: borderRadius.sm,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

