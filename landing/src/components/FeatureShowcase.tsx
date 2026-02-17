"use client";

import { COLORS } from "@/lib/constants";
import { useScrollAnimation } from "@/lib/animations";
import { ShieldCheck, FileCheck2, Building2, CheckCircle2 } from "lucide-react";

const showcases = [
  {
    overline: "YAPAY ZEKA İLE KORUMA",
    title: "Dolandırıcılığı Yapay Zeka Tespit Etsin",
    description:
      "Isolation Forest makine öğrenimi algoritmaları ile anormal işlemleri otomatik tespit edin. Benford Yasası, dairesel işlem analizi ve naylon fatura kontrolü ile mali riskleri minimize edin.",
    bullets: [
      "Benford Yasası ile muhasebe anomalisi tespiti",
      "Dairesel işlem ve sahte fatura ağı analizi",
      "Gerçek zamanlı risk skorlama ve uyarılar",
      "MASAK eşik değeri otomatik takibi",
    ],
    icon: ShieldCheck,
    gradient: `linear-gradient(135deg, ${COLORS.accent}15 0%, ${COLORS.primary}08 100%)`,
  },
  {
    overline: "MEVZUAT UYUMU",
    title: "GİB Mevzuatına %100 Uyumlu",
    description:
      "E-Fatura, e-Defter ve e-Arşiv işlemlerinizi GİB standartlarına tam uyumlu olarak yönetin. VKN checksumu, KDV oran kontrolü ve çapraz doğrulama otomatik olarak yapılır.",
    bullets: [
      "UBL 2.1 formatında e-Fatura oluşturma",
      "e-Defter XBRL rapor paketleri",
      "Denetim öncesi 10 kontrol noktası",
      "Beyanname takvimi hatırlatıcıları",
    ],
    icon: FileCheck2,
    gradient: `linear-gradient(135deg, ${COLORS.primary}10 0%, ${COLORS.accent}08 100%)`,
  },
  {
    overline: "ÖLÇEKLENEBİLİR PLATFORM",
    title: "Yüzlerce Firmayı Tek Panelden Yönetin",
    description:
      "Multi-tenant mimarisi ile her müşterinizi izole ve güvenli bir şekilde yönetin. Firma bazlı raporlama, toplu belge işleme ve müşteri portalı ile operasyonel verimliliği artırın.",
    bullets: [
      "Firma bazlı izole veri yönetimi",
      "Çapraz firma dolandırıcılık tespiti",
      "Müşteri portalı ile belge paylaşımı",
      "Sektörel benchmark karşılaştırmaları",
    ],
    icon: Building2,
    gradient: `linear-gradient(135deg, ${COLORS.accent}12 0%, ${COLORS.primary}06 100%)`,
  },
];

function ShowcaseItem({
  item,
  reversed,
}: {
  item: (typeof showcases)[0];
  reversed: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const Icon = item.icon;

  return (
    <div
      ref={ref}
      className={`fade-up ${isVisible ? "visible" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "64px",
        flexDirection: reversed ? "row-reverse" : "row",
        flexWrap: "wrap",
        justifyContent: "center",
        padding: "48px 0",
      }}
    >
      {/* Visual */}
      <div
        style={{
          flex: "1 1 360px",
          maxWidth: "480px",
          background: item.gradient,
          borderRadius: "24px",
          padding: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "320px",
        }}
      >
        <Icon size={120} color={COLORS.accent} strokeWidth={1} />
      </div>

      {/* Text */}
      <div style={{ flex: "1 1 400px", maxWidth: "520px" }}>
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
          {item.overline}
        </p>
        <h3
          style={{
            fontSize: "clamp(24px, 3vw, 30px)",
            fontWeight: 700,
            color: COLORS.text.primary,
            marginBottom: "16px",
            lineHeight: 1.25,
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            fontSize: "16px",
            color: COLORS.text.secondary,
            lineHeight: 1.7,
            marginBottom: "24px",
          }}
        >
          {item.description}
        </p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
          {item.bullets.map((bullet, j) => (
            <li
              key={j}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "15px",
                color: COLORS.text.secondary,
              }}
            >
              <CheckCircle2 size={18} color={COLORS.success} />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section
      style={{
        padding: "48px 24px 96px",
        background: COLORS.backgroundAlt,
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {showcases.map((item, i) => (
          <ShowcaseItem key={i} item={item} reversed={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
