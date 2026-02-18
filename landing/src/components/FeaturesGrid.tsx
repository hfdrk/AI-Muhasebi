"use client";

import { COLORS, FEATURES } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";
import {
  Brain, FileCheck, Shield, Building2, Landmark, Lock,
  BarChart3, TrendingUp, FileText, GitCompareArrows,
  ClipboardCheck, PieChart, ScanLine, Users, Calendar,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
  Brain, FileCheck, Shield, Building2, Landmark, Lock,
  BarChart3, TrendingUp, FileText, GitCompareArrows,
  ClipboardCheck, PieChart, ScanLine, Users, Calendar,
};

export default function FeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="ozellikler"
      ref={ref}
      style={{
        padding: "96px 24px",
        background: COLORS.background,
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Section Header */}
        <div
          style={{ textAlign: "center", marginBottom: "64px" }}
          className={`fade-up ${isVisible ? "visible" : ""}`}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.accent,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            Platform Özellikleri
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 700,
              color: COLORS.text.primary,
              marginBottom: "16px",
            }}
          >
            Muhasebe İşlemlerinizi Dijitalleştirin
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: COLORS.text.secondary,
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            15 temel modülü ile mali müşavirlik ofislerinizi tam dijital
            dönüşüme taşıyın.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {FEATURES.map((feature, i) => {
            const IconComp = iconMap[feature.icon] || Brain;
            return (
              <div
                key={i}
                className={`feature-card fade-up ${isVisible ? "visible" : ""}`}
                style={{
                  padding: "32px",
                  borderRadius: "16px",
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.background,
                  transitionDelay: `${(i % 6) * 80}ms`,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: `${COLORS.accent}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <IconComp size={24} color={COLORS.accent} />
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: COLORS.text.primary,
                    marginBottom: "8px",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: "15px",
                    color: COLORS.text.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
