"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "32px",
        textAlign: "center",
        background: "linear-gradient(135deg, #e8eef5 0%, #ffffff 100%)",
      }}
    >
      <h1
        style={{
          fontSize: "72px",
          fontWeight: 700,
          color: "#1e3a5f",
          marginBottom: "8px",
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#1a1a2e",
          marginBottom: "16px",
        }}
      >
        Sayfa Bulunamadı
      </h2>
      <p
        style={{
          fontSize: "16px",
          color: "#6b7280",
          marginBottom: "32px",
          maxWidth: "400px",
        }}
      >
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        href="/anasayfa"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 24px",
          backgroundColor: "#1e3a5f",
          color: "#ffffff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "14px",
        }}
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
