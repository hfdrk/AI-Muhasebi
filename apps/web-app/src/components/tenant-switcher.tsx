"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCurrentUser, switchTenant } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { colors, spacing, shadows, borderRadius, transitions, zIndex, typography } from "../styles/design-system";
import { Icon } from "./ui/Icon";
import { Tooltip } from "./ui/Tooltip";

export function TenantSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const switchMutation = useMutation({
    mutationFn: (tenantId: string) => switchTenant({ tenantId }),
    onSuccess: () => {
      router.refresh();
      refetch();
      setIsOpen(false);
    },
  });

  const tenants = data?.data.tenants || [];
  const currentTenant = tenants.find((t) => t.status === "active");

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-tenant-switcher]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (tenants.length <= 1) {
    return currentTenant ? (
      <div 
        style={{ 
          padding: "10px 14px", 
          backgroundColor: colors.gray[50], 
          borderRadius: borderRadius.md,
          border: `1px solid ${colors.border}`,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
        }}
      >
        <span style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>Şirket / Ofis: </span>
        <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{currentTenant.name}</span>
      </div>
    ) : null;
  }

  return (
    <div style={{ position: "relative" }} data-tenant-switcher>
      <Tooltip content="Şirket / Ofis Değiştir">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
          padding: "10px 14px",
          backgroundColor: isOpen ? colors.primaryLighter : colors.gray[50],
          border: `1px solid ${isOpen ? colors.primary : colors.border}`,
          borderRadius: borderRadius.md,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          transition: `all ${transitions.normal} ease`,
          minWidth: "200px",
          boxShadow: isOpen ? shadows.md : shadows.sm,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = colors.primaryLighter;
            e.currentTarget.style.borderColor = colors.primary;
            e.currentTarget.style.boxShadow = shadows.md;
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = colors.gray[50];
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.boxShadow = shadows.sm;
          }
        }}
      >
        <span style={{ fontSize: "16px" }}>🏢</span>
        <span style={{ flex: 1, textAlign: "left", fontSize: typography.fontSize.sm }}>
          <span style={{ fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>Şirket / Ofis: </span>
          <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
            {currentTenant?.name || "Seçiniz"}
          </span>
        </span>
        <span
          style={{
            fontSize: "10px",
            color: colors.text.secondary,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${transitions.normal} ease`,
          }}
        >
          ▼
        </span>
      </button>
      </Tooltip>

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: zIndex.dropdown - 1,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              boxShadow: shadows.xl,
              zIndex: zIndex.dropdown,
              minWidth: "280px",
              maxWidth: "320px",
              overflow: "hidden",
              animation: "slideDown 0.2s ease",
            }}
          >
            <div
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.gray[50],
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Şirket / Ofis Seçin
            </div>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {tenants.map((tenant) => {
                const isActive = tenant.id === currentTenant?.id;
                return (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      if (!isActive) {
                        switchMutation.mutate(tenant.id);
                      }
                    }}
                    disabled={switchMutation.isPending || isActive}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.lg}`,
                      textAlign: "left",
                      border: "none",
                      backgroundColor: isActive ? colors.primaryLighter : colors.white,
                      cursor: isActive ? "default" : "pointer",
                      opacity: switchMutation.isPending ? 0.6 : 1,
                      transition: `all ${transitions.normal} ease`,
                      borderLeft: isActive ? `3px solid ${colors.primary}` : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.sm,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !switchMutation.isPending) {
                        e.currentTarget.style.backgroundColor = colors.gray[50];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !switchMutation.isPending) {
                        e.currentTarget.style.backgroundColor = colors.white;
                      }
                    }}
                  >
                    <Icon name="building" size={18} color={isActive ? colors.primary : colors.text.primary} />
                    <span
                      style={{
                        flex: 1,
                        fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                        color: isActive ? colors.primary : colors.text.primary,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {tenant.name}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          color: colors.primary,
                          fontSize: "16px",
                          fontWeight: typography.fontWeight.bold,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

