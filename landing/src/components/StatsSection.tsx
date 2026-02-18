"use client";

import { COLORS, STATS } from "@/lib/constants";
import { useScrollAnimation, useCountUp } from "@/lib/animations";

function StatItem({
  stat,
  isVisible,
  delay,
}: {
  stat: { value: number; label: string; suffix?: string; prefix?: string };
  isVisible: boolean;
  delay: number;
}) {
  const count = useCountUp(stat.value, 2000, isVisible);
  const display = stat.prefix
    ? `${stat.prefix}${count}`
    : stat.suffix
      ? `${count}${stat.suffix}`
      : `${count}`;

  return (
    <div
      className={`fade-up ${isVisible ? "visible" : ""}`}
      style={{
        textAlign: "center",
        flex: "1 1 200px",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          fontSize: "clamp(36px, 5vw, 48px)",
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1.2,
          marginBottom: "8px",
        }}
      >
        {display}
      </div>
      <div
        style={{
          fontSize: "15px",
          color: COLORS.gray[400],
          fontWeight: 500,
        }}
      >
        {stat.label}
      </div>
    </div>
  );
}

export default function StatsSection() {
  const { ref, isVisible } = useScrollAnimation(0.3);

  return (
    <section
      ref={ref}
      style={{
        padding: "64px 24px",
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: "1024px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "40px",
          justifyContent: "center",
        }}
      >
        {STATS.map((stat, i) => (
          <StatItem key={i} stat={stat} isVisible={isVisible} delay={i * 150} />
        ))}
      </div>
    </section>
  );
}
