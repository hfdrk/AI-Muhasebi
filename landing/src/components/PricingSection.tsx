"use client";

import { COLORS, PRICING_PLANS, REGISTER_URL } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";
import { Check } from "lucide-react";

export default function PricingSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="fiyatlandirma"
      ref={ref}
      style={{
        padding: "96px 24px",
        background: COLORS.backgroundAlt,
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
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
            Fiyatlandırma
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 700,
              color: COLORS.text.primary,
              marginBottom: "16px",
            }}
          >
            İhtiyacınıza Uygun Plan Seçin
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: COLORS.text.secondary,
            }}
          >
            Tüm planlar 14 gün ücretsiz deneme içermektedir.
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            alignItems: "stretch",
          }}
        >
          {PRICING_PLANS.map((plan, i) => (
            <div
              key={i}
              className={`fade-up ${isVisible ? "visible" : ""} ${plan.popular ? "pricing-popular" : ""}`}
              style={{
                padding: "40px 32px",
                borderRadius: "20px",
                background: COLORS.background,
                border: plan.popular
                  ? `2px solid ${COLORS.accent}`
                  : `1px solid ${COLORS.border}`,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transitionDelay: `${i * 120}ms`,
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: COLORS.accent,
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 16px",
                    borderRadius: "100px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  En Popüler
                </div>
              )}

              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: COLORS.text.primary,
                  marginBottom: "8px",
                }}
              >
                {plan.name}
              </h3>
              <div
                style={{
                  fontSize: "clamp(28px, 3vw, 36px)",
                  fontWeight: 700,
                  color: COLORS.text.primary,
                  marginBottom: "4px",
                }}
              >
                {plan.price}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: COLORS.text.muted,
                  marginBottom: "32px",
                }}
              >
                {plan.subtitle}
              </p>

              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  flex: 1,
                  marginBottom: "32px",
                }}
              >
                {plan.features.map((feature, j) => (
                  <li
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      color: COLORS.text.secondary,
                    }}
                  >
                    <Check
                      size={16}
                      color={plan.popular ? COLORS.accent : COLORS.success}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={REGISTER_URL}
                className={plan.popular ? "btn-primary" : "btn-secondary"}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: plan.popular ? "#fff" : COLORS.primary,
                  background: plan.popular ? COLORS.accent : "transparent",
                  border: plan.popular
                    ? "none"
                    : `1.5px solid ${COLORS.border}`,
                  boxShadow: plan.popular
                    ? `0 4px 14px ${COLORS.accent}30`
                    : "none",
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
