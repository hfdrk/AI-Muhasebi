"use client";

import { COLORS, REGISTER_URL } from "@/lib/constants";
import { BarChart3, ArrowRight, Play } from "lucide-react";

export default function HeroSection() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 96px",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, #f0f4f8 0%, #ffffff 40%, ${COLORS.backgroundAlt} 100%)`,
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          right: "-100px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          left: "-50px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}06 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "1280px", width: "100%", display: "flex", alignItems: "center", gap: "64px", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Left: Text */}
        <div style={{ flex: "1 1 520px", maxWidth: "640px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "100px",
              background: `${COLORS.accent}10`,
              border: `1px solid ${COLORS.accent}25`,
              marginBottom: "24px",
            }}
          >
            <BarChart3 size={14} color={COLORS.accent} />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: COLORS.accent,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Yapay Zeka Destekli Muhasebe Platformu
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: COLORS.text.primary,
              marginBottom: "24px",
            }}
          >
            Mali Müşavirler İçin{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Akıllı Muhasebe
            </span>{" "}
            Çözümü
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.7,
              color: COLORS.text.secondary,
              marginBottom: "40px",
              maxWidth: "540px",
            }}
          >
            GİB uyumlu e-Fatura, e-Defter ve e-Arşiv işlemlerini yapay zeka ile
            otomatikleştirin. MASAK denetimi, risk analizi ve 7 banka
            entegrasyonu tek platformda.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
            <a
              href={REGISTER_URL}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "16px 32px",
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                background: COLORS.accent,
                borderRadius: "12px",
                boxShadow: `0 4px 14px ${COLORS.accent}40`,
              }}
            >
              Ücretsiz Başlayın
              <ArrowRight size={18} />
            </a>
            <a
              href="#ozellikler"
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "16px 32px",
                fontSize: "16px",
                fontWeight: 600,
                color: COLORS.text.primary,
                background: "transparent",
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: "12px",
              }}
            >
              <Play size={16} />
              Özellikleri Keşfedin
            </a>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: COLORS.text.muted,
            }}
          >
            Kredi kartı gerekmez &bull; 14 gün ücretsiz deneme &bull; Anında
            kurulum
          </p>
        </div>

        {/* Right: Dashboard Mockup */}
        <div
          style={{
            flex: "1 1 400px",
            maxWidth: "540px",
            position: "relative",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              borderRadius: "20px",
              padding: "24px",
              boxShadow: `0 30px 60px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(255,255,255,0.05)`,
              transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)",
            }}
          >
            {/* Mock browser bar */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "16px",
              }}
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
            </div>
            {/* Mock dashboard content */}
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              {/* KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Toplam Gelir", value: "₺2.4M", color: "#22c55e" },
                  { label: "Risk Skoru", value: "12.4", color: "#f59e0b" },
                  { label: "Aktif Firma", value: "147", color: "#3b82f6" },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>{kpi.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              {/* Chart placeholder */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "16px", height: "120px", display: "flex", alignItems: "end", gap: "4px" }}>
                {[40, 65, 50, 80, 60, 90, 70, 85, 95, 75, 88, 92].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: `linear-gradient(to top, ${COLORS.accent}80, ${COLORS.accent}20)`,
                      borderRadius: "3px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div
            style={{
              position: "absolute",
              bottom: "-16px",
              left: "-16px",
              background: "#fff",
              borderRadius: "12px",
              padding: "12px 20px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              fontWeight: 600,
              color: COLORS.text.primary,
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
            GİB Uyumlu
          </div>
        </div>
      </div>
    </section>
  );
}
