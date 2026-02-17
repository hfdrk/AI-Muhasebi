"use client";

import { COLORS, REGISTER_URL } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      style={{
        padding: "80px 24px",
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
        textAlign: "center",
      }}
    >
      <div
        style={{ maxWidth: "640px", margin: "0 auto" }}
        className={`fade-up ${isVisible ? "visible" : ""}`}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "16px",
            lineHeight: 1.3,
          }}
        >
          Mali Müşavirlikte Yeni Nesil Başlasın
        </h2>
        <p
          style={{
            fontSize: "18px",
            color: COLORS.gray[400],
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          14 gün ücretsiz deneyin. Kurulum 2 dakika sürer. Kredi kartı
          gerekmez.
        </p>
        <a
          href={REGISTER_URL}
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "18px 40px",
            fontSize: "17px",
            fontWeight: 600,
            color: "#fff",
            background: COLORS.accent,
            borderRadius: "14px",
            boxShadow: `0 6px 20px ${COLORS.accent}50`,
          }}
        >
          Ücretsiz Hesap Oluşturun
          <ArrowRight size={20} />
        </a>
      </div>
    </section>
  );
}
