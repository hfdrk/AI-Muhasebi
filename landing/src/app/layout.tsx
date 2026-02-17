import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Muhasebi - Yapay Zeka Destekli Muhasebe Platformu",
  description:
    "Mali müşavirler için AI destekli muhasebe çözümü. GİB uyumlu e-Fatura, MASAK izleme, risk analizi ve 7 banka entegrasyonu.",
  openGraph: {
    title: "AI Muhasebi - Akıllı Muhasebe Çözümü",
    description:
      "Türkiye'nin en gelişmiş yapay zeka destekli muhasebe platformu",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
