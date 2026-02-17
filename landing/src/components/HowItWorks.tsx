"use client";

import { COLORS, STEPS } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";
import { UserPlus, Link2, Sparkles } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
  UserPlus,
  Link2,
  Sparkles,
};

export default function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="nasil-calisir"
      ref={ref}
      style={{
        padding: "96px 24px",
        background: COLORS.background,
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Header */}
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
            Nasıl Çalışır?
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 700,
              color: COLORS.text.primary,
              marginBottom: "16px",
            }}
          >
            3 Adımda Dijital Dönüşüm
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: COLORS.text.secondary,
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            Dakikalar içinde kurulumu tamamlayın ve hemen çalışın.
          </p>
        </div>

        {/* Steps */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
          }}
        >
          {STEPS.map((step, i) => {
            const IconComp = iconMap[step.icon] || Sparkles;
            return (
              <div
                key={i}
                className={`fade-up ${isVisible ? "visible" : ""}`}
                style={{
                  textAlign: "center",
                  padding: "40px 32px",
                  borderRadius: "20px",
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.background,
                  position: "relative",
                  transitionDelay: `${i * 150}ms`,
                }}
              >
                {/* Step Number */}
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: 800,
                    color: `${COLORS.accent}15`,
                    position: "absolute",
                    top: "16px",
                    left: "24px",
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </div>
                {/* Icon */}
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: `${COLORS.accent}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <IconComp size={28} color={COLORS.accent} />
                </div>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: COLORS.text.primary,
                    marginBottom: "12px",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "15px",
                    color: COLORS.text.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
