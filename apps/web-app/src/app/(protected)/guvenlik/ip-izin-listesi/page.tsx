"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { securityClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../../../../styles/design-system";

export default function IPWhitelistPage() {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const queryClient = useQueryClient();

  // Check current IP status
  const { data: ipStatusData } = useQuery({
    queryKey: ["ip-whitelist-check"],
    queryFn: () => securityClient.checkIPWhitelist(),
  });

  const ipStatus = ipStatusData?.data;

  // Add IP to whitelist mutation
  const addIPMutation = useMutation({
    mutationFn: () => {
      if (!ipAddress.trim()) {
        throw new Error("IP adresi gerekli");
      }
      return securityClient.addIPWhitelist(ipAddress.trim(), description || undefined);
    },
    onSuccess: () => {
      alert("IP adresi başarıyla izin listesine eklendi!");
      setIpAddress("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["ip-whitelist-check"] });
    },
    onError: (error: Error) => {
      alert(`Hata: ${error.message}`);
    },
  });

  return (
    <div
      style={{
        padding: spacing.xxl,
        maxWidth: "1600px",
        margin: "0 auto",
        backgroundColor: colors.gray[50],
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
          <Button variant="ghost" asLink href="/guvenlik" icon="←">
            Geri
          </Button>
        </div>
        <h1
          style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          IP İzin Listesi
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          Belirli IP adreslerinden erişime izin verin. IP izin listesi, hesap güvenliğini artırmak için kullanılabilir.
        </p>
      </div>

      {/* Current IP Status */}
      {ipStatus && (
        <Card
          variant="elevated"
          style={{
            marginBottom: spacing.lg,
            backgroundColor: ipStatus.isWhitelisted
              ? colors.successLight
              : colors.warningLight,
            border: `2px solid ${ipStatus.isWhitelisted ? colors.success : colors.warning}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <span style={{ fontSize: "32px" }}>{ipStatus.isWhitelisted ? "✅" : "⚠️"}</span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                }}
              >
                Mevcut IP Adresi: {ipStatus.ipAddress}
              </p>
              <p
                style={{
                  margin: `${spacing.xs} 0 0 0`,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                {ipStatus.isWhitelisted
                  ? "Bu IP adresi izin listesinde."
                  : "Bu IP adresi izin listesinde değil."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add IP to Whitelist */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <h2
          style={{
            margin: `0 0 ${spacing.md} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          IP Adresi Ekle
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              IP Adresi *
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.1 veya 192.168.1.0/24 (CIDR)"
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
                fontFamily: "monospace",
              }}
            />
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
              }}
            >
              IPv4, IPv6 veya CIDR notasyonu (örn: 192.168.1.0/24) desteklenir.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Açıklama (Opsiyonel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Ofis IP adresi"
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            />
          </div>

          <div>
            <Button
              variant="primary"
              onClick={() => addIPMutation.mutate()}
              loading={addIPMutation.isPending}
              disabled={!ipAddress.trim()}
            >
              ➕ IP Adresini Ekle
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card
        variant="outlined"
        style={{
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xl, flexShrink: 0 }}>ℹ️</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.xs,
              }}
            >
              IP İzin Listesi Hakkında
            </p>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              IP izin listesi, belirli IP adreslerinden erişime izin verir. Bu özellik, hesap güvenliğini
              artırmak için kullanılabilir. Not: IP izin listesi şu anda opsiyoneldir ve varsayılan olarak
              tüm IP adreslerinden erişime izin verilir.
            </p>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

