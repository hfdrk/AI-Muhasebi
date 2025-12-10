"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { colors, spacing } from "../../../styles/design-system";

async function getDailyRiskSummary() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await fetch("/api/v1/ai/summaries/daily-risk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
  return response.json();
}

async function getPortfolioSummary() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await fetch("/api/v1/ai/summaries/portfolio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
  return response.json();
}

export default function ReportsPage() {
  const [summaryModal, setSummaryModal] = useState<{ visible: boolean; title: string; text: string }>({
    visible: false,
    title: "",
    text: "",
  });

  const dailyRiskMutation = useMutation({
    mutationFn: getDailyRiskSummary,
    onSuccess: (data) => {
      setSummaryModal({
        visible: true,
        title: "Bugünün Risk Özeti",
        text: data.data.summary,
      });
    },
    onError: (error: any) => {
      alert(error.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
    },
  });

  const portfolioMutation = useMutation({
    mutationFn: getPortfolioSummary,
    onSuccess: (data) => {
      setSummaryModal({
        visible: true,
        title: "Portföy Özeti",
        text: data.data.summary,
      });
    },
    onError: (error: any) => {
      alert(error.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
    },
  });
  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: spacing.sm, color: colors.text.primary }}>
          Raporlar
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: "16px" }}>
          Finansal özetler, risk analizleri ve aktivite raporları oluşturun ve yönetin.
        </p>
      </div>

      {/* AI Summary Panel */}
      <div
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          backgroundColor: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: spacing.md, color: "#0369a1" }}>
          AI Özetleri
        </h3>
        <div style={{ display: "flex", gap: spacing.md }}>
          <button
            onClick={() => dailyRiskMutation.mutate()}
            disabled={dailyRiskMutation.isPending}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007AFF",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: dailyRiskMutation.isPending ? "not-allowed" : "pointer",
              opacity: dailyRiskMutation.isPending ? 0.6 : 1,
              fontWeight: 500,
            }}
          >
            {dailyRiskMutation.isPending ? "Oluşturuluyor..." : "Bugünün Risk Özetini Oluştur"}
          </button>
          <button
            onClick={() => portfolioMutation.mutate()}
            disabled={portfolioMutation.isPending}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007AFF",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: portfolioMutation.isPending ? "not-allowed" : "pointer",
              opacity: portfolioMutation.isPending ? 0.6 : 1,
              fontWeight: 500,
            }}
          >
            {portfolioMutation.isPending ? "Oluşturuluyor..." : "Portföy Özeti Oluştur"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing.lg }}>
        <Link
          href="/raporlar/anlik"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.sm, color: colors.primary }}>
            Anlık Raporlar
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: "14px", lineHeight: 1.6 }}>
            İstediğiniz zaman finansal özet, risk analizi ve aktivite raporları oluşturun. PDF veya Excel formatında indirin.
          </p>
        </Link>

        <Link
          href="/raporlar/zamanlanmis"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            padding: spacing.xl,
            backgroundColor: colors.white,
            borderRadius: "8px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: spacing.sm, color: colors.primary }}>
            Zamanlanmış Raporlar
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: "14px", lineHeight: 1.6 }}>
            Raporları otomatik olarak günlük, haftalık veya aylık olarak oluşturun ve e-posta ile gönderin.
          </p>
        </Link>
      </div>

      {/* Summary Modal */}
      {summaryModal.visible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSummaryModal({ visible: false, title: "", text: "" })}
        >
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: "12px",
              padding: spacing.xl,
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: colors.text.primary }}>{summaryModal.title}</h3>
              <button
                onClick={() => setSummaryModal({ visible: false, title: "", text: "" })}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: colors.text.secondary,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ color: colors.text.primary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {summaryModal.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


