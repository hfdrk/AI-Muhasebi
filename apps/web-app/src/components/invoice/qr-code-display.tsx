"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Download, Copy, Check, Loader2 } from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "@/styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

// ==================== Types ====================

interface QRCodeData {
  invoiceId: string;
  ettn?: string;
  qrCode: string;
  format: string;
  content: string;
  generatedAt: string;
}

interface QRCodeDisplayProps {
  invoiceId: string;
  type?: "e-fatura" | "e-arsiv" | "payment";
  size?: number;
  showActions?: boolean;
  paymentData?: {
    iban: string;
    receiverName: string;
    amount: number;
    currency?: string;
    reference?: string;
  };
  onLoad?: (data: QRCodeData) => void;
  onError?: (error: Error) => void;
}

// ==================== QR Code Display Component ====================

export function QRCodeDisplay({
  invoiceId,
  type = "e-fatura",
  size = 200,
  showActions = true,
  paymentData,
  onLoad,
  onError,
}: QRCodeDisplayProps) {
  const { themeColors } = useTheme();
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchQRCode();
  }, [invoiceId, type]);

  const fetchQRCode = async () => {
    setLoading(true);
    setError(null);

    try {
      let url: string;
      let options: RequestInit = {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (type === "payment" && paymentData) {
        url = "/api/v1/e-fatura/qr/payment";
        options.method = "POST";
        options.body = JSON.stringify(paymentData);
      } else if (type === "e-arsiv") {
        url = `/api/v1/e-fatura/qr/e-arsiv/${invoiceId}?size=${size}`;
        options.method = "GET";
      } else {
        url = `/api/v1/e-fatura/qr/${invoiceId}?size=${size}`;
        options.method = "GET";
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "QR kodu oluşturulamadı.");
      }

      setQrData(result.data);
      onLoad?.(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!qrData?.content) return;

    try {
      await navigator.clipboard.writeText(qrData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.error("Kopyalama başarısız");
      }
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrCode) return;

    const link = document.createElement("a");

    if (qrData.format === "svg") {
      const blob = new Blob([qrData.qrCode], { type: "image/svg+xml" });
      link.href = URL.createObjectURL(blob);
      link.download = `qr-${invoiceId}.svg`;
    } else {
      link.href = qrData.qrCode;
      link.download = `qr-${invoiceId}.png`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: themeColors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${themeColors.border}`,
  };

  const qrContainerStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColors.white,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: spacing.sm,
    marginTop: spacing.md,
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.fontSize.sm,
    color: themeColors.text.secondary,
    backgroundColor: themeColors.gray[50],
    border: `1px solid ${themeColors.border}`,
    borderRadius: borderRadius.md,
    cursor: "pointer",
    transition: `all ${transitions.fast} ease`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: themeColors.text.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={qrContainerStyle}>
          <Loader2
            size={32}
            color={colors.primary}
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={labelStyle}>QR kodu oluşturuluyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            ...qrContainerStyle,
            backgroundColor: colors.dangerLight,
            flexDirection: "column",
            gap: spacing.sm,
          }}
        >
          <QrCode size={48} color={colors.danger} />
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.danger,
              textAlign: "center",
              margin: 0,
              padding: spacing.sm,
            }}
          >
            {error}
          </p>
        </div>
        <button
          style={{
            ...buttonStyle,
            marginTop: spacing.md,
            color: colors.primary,
          }}
          onClick={fetchQRCode}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!qrData) return null;

  return (
    <div style={containerStyle}>
      <div style={qrContainerStyle}>
        {qrData.format === "svg" ? (
          <div dangerouslySetInnerHTML={{ __html: qrData.qrCode }} />
        ) : (
          <img
            src={qrData.qrCode}
            alt="QR Code"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>

      {qrData.ettn && (
        <p style={labelStyle}>
          ETTN: <strong>{qrData.ettn}</strong>
        </p>
      )}

      <p style={{ ...labelStyle, marginTop: spacing.xs }}>
        {type === "payment"
          ? "Ödeme QR Kodu (TR Karekod)"
          : type === "e-arsiv"
          ? "E-Arşiv Fatura QR"
          : "E-Fatura QR"}
      </p>

      {showActions && (
        <div style={actionsStyle}>
          <button
            style={buttonStyle}
            onClick={handleCopy}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[50];
            }}
          >
            {copied ? (
              <>
                <Check size={14} color={colors.success} />
                <span>Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Kopyala</span>
              </>
            )}
          </button>
          <button
            style={buttonStyle}
            onClick={handleDownload}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.gray[50];
            }}
          >
            <Download size={14} />
            <span>İndir</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Inline QR Code ====================

interface InlineQRCodeProps {
  invoiceId: string;
  size?: number;
  type?: "e-fatura" | "e-arsiv";
}

export function InlineQRCode({ invoiceId, size = 80, type = "e-fatura" }: InlineQRCodeProps) {
  const { themeColors } = useTheme();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const endpoint = type === "e-arsiv"
          ? `/api/v1/e-fatura/qr/e-arsiv/${invoiceId}?size=${size}`
          : `/api/v1/e-fatura/qr/${invoiceId}?size=${size}`;

        const response = await fetch(endpoint, { credentials: "include" });
        const result = await response.json();

        if (response.ok) {
          setQrCode(result.data.qrCode);
        }
      } catch {
        // Silent fail for inline display
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [invoiceId, size, type]);

  if (loading) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: themeColors.gray[50],
          borderRadius: borderRadius.sm,
        }}
      >
        <Loader2 size={16} color={colors.gray[400]} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!qrCode) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: themeColors.gray[50],
          borderRadius: borderRadius.sm,
        }}
      >
        <QrCode size={size * 0.4} color={themeColors.gray[300]} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius.sm,
        overflow: "hidden",
        backgroundColor: themeColors.white,
        border: `1px solid ${themeColors.border}`,
      }}
      dangerouslySetInnerHTML={{ __html: qrCode }}
    />
  );
}

// ==================== Payment QR Modal ====================

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  iban: string;
  receiverName: string;
  amount: number;
  reference?: string;
}

export function PaymentQRModal({
  isOpen,
  onClose,
  invoiceId,
  iban,
  receiverName,
  amount,
  reference,
}: PaymentQRModalProps) {
  const { themeColors } = useTheme();
  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: themeColors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    maxWidth: "400px",
    width: "90%",
    boxShadow: shadows.xl,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.primary,
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: spacing.xs,
    color: themeColors.text.muted,
  };

  const infoStyle: React.CSSProperties = {
    backgroundColor: themeColors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  };

  const infoRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: `${spacing.xs} 0`,
    fontSize: typography.fontSize.sm,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>Ödeme QR Kodu</h3>
          <button style={closeButtonStyle} onClick={onClose}>
            ✕
          </button>
        </div>

        <QRCodeDisplay
          invoiceId={invoiceId}
          type="payment"
          size={250}
          paymentData={{
            iban,
            receiverName,
            amount,
            reference,
          }}
        />

        <div style={infoStyle}>
          <div style={infoRowStyle}>
            <span style={{ color: themeColors.text.muted }}>Alıcı:</span>
            <span style={{ fontWeight: typography.fontWeight.medium }}>{receiverName}</span>
          </div>
          <div style={infoRowStyle}>
            <span style={{ color: themeColors.text.muted }}>IBAN:</span>
            <span style={{ fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.xs }}>
              {iban}
            </span>
          </div>
          <div style={infoRowStyle}>
            <span style={{ color: themeColors.text.muted }}>Tutar:</span>
            <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.success }}>
              {amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
            </span>
          </div>
          {reference && (
            <div style={infoRowStyle}>
              <span style={{ color: themeColors.text.muted }}>Referans:</span>
              <span>{reference}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
