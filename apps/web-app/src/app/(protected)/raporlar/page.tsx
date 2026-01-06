"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { colors, spacing, borderRadius, typography, shadows } from "../../../styles/design-system";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "../../../lib/toast";

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
      toast.error(error.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
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
      toast.error(error.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
    },
  });
  return (
    <PageTransition>
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
      <Card
        style={{
          marginBottom: spacing.xl,
          backgroundColor: colors.infoLight,
          border: `1px solid ${colors.info}`,
        }}
      >
        <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md, color: colors.info }}>
          AI Özetleri
        </h3>
        <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
          <Button
            onClick={() => dailyRiskMutation.mutate()}
            disabled={dailyRiskMutation.isPending}
            variant="primary"
            loading={dailyRiskMutation.isPending}
          >
            {dailyRiskMutation.isPending ? "Oluşturuluyor..." : "Bugünün Risk Özetini Oluştur"}
          </Button>
          <Button
            onClick={() => portfolioMutation.mutate()}
            disabled={portfolioMutation.isPending}
            variant="primary"
            loading={portfolioMutation.isPending}
          >
            {portfolioMutation.isPending ? "Oluşturuluyor..." : "Portföy Özeti Oluştur"}
          </Button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing.lg }}>
        {/* Executive Summary - New Featured Card */}
        <Link href="/raporlar/yonetici-ozeti" style={{ textDecoration: "none", color: "inherit" }}>
          <Card hoverable style={{ background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${colors.white} 100%)`, border: `2px solid ${colors.primary}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
              <span style={{ fontSize: "24px" }}>📊</span>
              <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.primary, margin: 0 }}>
                Yönetici Özeti
              </h2>
              <span style={{ fontSize: typography.fontSize.xs, backgroundColor: colors.success, color: colors.white, padding: `2px ${spacing.sm}`, borderRadius: borderRadius.full, fontWeight: typography.fontWeight.semibold }}>
                YENİ
              </span>
            </div>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6 }}>
              Gelişmiş KPI'lar, dönem karşılaştırmaları, hedef takibi ve interaktif grafiklerle kapsamlı yönetici panosu.
            </p>
          </Card>
        </Link>

        <Link href="/raporlar/anlik" style={{ textDecoration: "none", color: "inherit" }}>
          <Card hoverable>
            <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, color: colors.primary }}>
              Anlık Raporlar
            </h2>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6 }}>
              İstediğiniz zaman finansal özet, risk analizi ve aktivite raporları oluşturun. PDF veya Excel formatında indirin.
            </p>
          </Card>
        </Link>

        <Link href="/raporlar/zamanlanmis" style={{ textDecoration: "none", color: "inherit" }}>
          <Card hoverable>
            <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, color: colors.primary }}>
              Zamanlanmış Raporlar
            </h2>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6 }}>
              Raporları otomatik olarak günlük, haftalık veya aylık olarak oluşturun ve e-posta ile gönderin.
            </p>
          </Card>
        </Link>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={summaryModal.visible}
        onClose={() => setSummaryModal({ visible: false, title: "", text: "" })}
        title={summaryModal.title}
        size="lg"
      >
        <div style={{ color: colors.text.primary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {summaryModal.text}
        </div>
      </Modal>
    </div>
    </PageTransition>
  );
}


