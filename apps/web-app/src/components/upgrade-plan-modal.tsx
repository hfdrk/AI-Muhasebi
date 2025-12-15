"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSubscription } from "@repo/api-client";
import { billing as billingTranslations } from "@repo/i18n";
import { toast } from "@/lib/toast";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: "FREE" | "PRO" | "ENTERPRISE";
  onSuccess?: () => void;
}

const PLAN_CONFIGS = {
  FREE: {
    maxClientCompanies: 3,
    maxDocumentsPerMonth: 100,
    maxAiAnalysesPerMonth: 50,
    maxUsers: 3,
    maxScheduledReports: 1,
  },
  PRO: {
    maxClientCompanies: 50,
    maxDocumentsPerMonth: 1000,
    maxAiAnalysesPerMonth: 500,
    maxUsers: 20,
    maxScheduledReports: 10,
  },
  ENTERPRISE: {
    maxClientCompanies: 10000,
    maxDocumentsPerMonth: 100000,
    maxAiAnalysesPerMonth: 50000,
    maxUsers: 1000,
    maxScheduledReports: 1000,
  },
};

const PLAN_ORDER: ("FREE" | "PRO" | "ENTERPRISE")[] = ["FREE", "PRO", "ENTERPRISE"];

export function UpgradePlanModal({ isOpen, onClose, currentPlan, onSuccess }: UpgradePlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO" | "ENTERPRISE">(currentPlan);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (plan: "FREE" | "PRO" | "ENTERPRISE") => updateSubscription({ plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      onClose();
      // Show success message
      toast.success("Plan başarıyla güncellendi!");
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Plan güncellenirken bir hata oluştu.");
    },
  });

  const handleUpgrade = () => {
    if (selectedPlan === currentPlan) {
      setError("Lütfen mevcut plandan farklı bir plan seçin.");
      return;
    }
    setError(null);
    mutation.mutate(selectedPlan);
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "FREE":
        return billingTranslations.subscription.planFree;
      case "PRO":
        return billingTranslations.subscription.planPro;
      case "ENTERPRISE":
        return billingTranslations.subscription.planEnterprise;
      default:
        return plan;
    }
  };

  const getAvailablePlans = () => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    return PLAN_ORDER.slice(currentIndex + 1);
  };

  const availablePlans = getAvailablePlans();

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
          maxWidth: "600px",
          margin: "20px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "20px", fontSize: "1.5rem", fontWeight: "600" }}>
          Planı Yükselt
        </h2>

        {error && (
          <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {availablePlans.length === 0 ? (
          <div style={{ padding: "16px", backgroundColor: "#f3f4f6", borderRadius: "4px", marginBottom: "20px" }}>
            <p style={{ color: "#374151" }}>
              Zaten en yüksek plana sahipsiniz.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {availablePlans.map((plan) => {
              const config = PLAN_CONFIGS[plan];
              const isSelected = selectedPlan === plan;

              return (
                <div
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    padding: "16px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#eff6ff" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
                      {getPlanName(plan)}
                    </h3>
                    {isSelected && (
                      <span style={{ color: "#3b82f6", fontSize: "0.875rem", fontWeight: "500" }}>
                        Seçildi
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", fontSize: "0.875rem", color: "#6b7280" }}>
                    <div>Müşteri Şirketi: {config.maxClientCompanies}</div>
                    <div>Doküman (aylık): {config.maxDocumentsPerMonth}</div>
                    <div>AI Analizi (aylık): {config.maxAiAnalysesPerMonth}</div>
                    <div>Kullanıcı: {config.maxUsers}</div>
                    <div>Zamanlanmış Rapor: {config.maxScheduledReports}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            İptal
          </button>
          {availablePlans.length > 0 && (
            <button
              onClick={handleUpgrade}
              disabled={mutation.isPending || selectedPlan === currentPlan}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: mutation.isPending || selectedPlan === currentPlan ? "#9ca3af" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: mutation.isPending || selectedPlan === currentPlan ? "not-allowed" : "pointer",
              }}
            >
              {mutation.isPending ? "Güncelleniyor..." : "Planı Güncelle"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

