"use client";

import { COLORS } from "@/lib/constants";
import { BarChart3 } from "lucide-react";

const footerLinks = {
  "Ürün": ["Özellikler", "Fiyatlandırma", "Entegrasyonlar", "Güncellemeler"],
  "Kaynaklar": ["Dokümantasyon", "API Referansı", "Blog", "Destek"],
  "Yasal": [
    "Gizlilik Politikası",
    "Kullanım Koşulları",
    "KVKK Aydınlatma Metni",
    "Çerez Politikası",
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        padding: "64px 24px 32px",
        background: COLORS.backgroundDark,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        {/* Main grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "48px",
            marginBottom: "48px",
          }}
        >
          {/* Brand Column */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={16} color="#fff" />
              </div>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                AI Muhasebi
              </span>
            </div>
            <p
              style={{
                fontSize: "14px",
                color: COLORS.gray[400],
                lineHeight: 1.6,
                maxWidth: "260px",
              }}
            >
              Yapay zeka destekli muhasebe platformu. Mali müşavirlik
              ofisleriniz için dijital dönüşüm çözümü.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: COLORS.gray[300],
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "20px",
                }}
              >
                {title}
              </h4>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{
                        fontSize: "14px",
                        color: COLORS.gray[400],
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#fff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = COLORS.gray[400])
                      }
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "#334155",
            marginBottom: "24px",
          }}
        />

        {/* Copyright */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "13px", color: COLORS.gray[500] }}>
            &copy; 2025 AI Muhasebi. Tüm hakları saklıdır.
          </p>
          <p style={{ fontSize: "13px", color: COLORS.gray[500] }}>
            Türkiye&apos;de tasarlanmış ve geliştirilmiştir.
          </p>
        </div>
      </div>
    </footer>
  );
}
