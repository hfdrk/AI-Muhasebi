"use client";

import { COLORS, COMPLIANCE_BADGES } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";

export default function LogoCloud() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      style={{
        padding: "48px 24px",
        background: COLORS.backgroundAlt,
        borderTop: `1px solid ${COLORS.border}`,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          className={`fade-up ${isVisible ? "visible" : ""}`}
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: COLORS.text.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "24px",
          }}
        >
          Türkiye&apos;nin Önde Gelen Mevzuatlarına Tam Uyumlu
        </p>
        <div
          className={`fade-up ${isVisible ? "visible" : ""}`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
            transitionDelay: "100ms",
          }}
        >
          {COMPLIANCE_BADGES.map((badge) => (
            <div
              key={badge}
              style={{
                padding: "8px 20px",
                borderRadius: "100px",
                background: "#fff",
                border: `1px solid ${COLORS.border}`,
                fontSize: "13px",
                fontWeight: 600,
                color: COLORS.text.secondary,
                transition: "all 0.2s",
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
