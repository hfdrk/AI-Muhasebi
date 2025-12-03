"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCurrentUser, switchTenant } from "@repo/api-client";
import { useRouter } from "next/navigation";

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
    },
  });

  const tenants = data?.data.tenants || [];
  const currentTenant = tenants.find((t) => t.status === "active");

  if (tenants.length <= 1) {
    return currentTenant ? (
      <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        <span style={{ fontWeight: "500" }}>Şirket / Ofis: </span>
        {currentTenant.name}
      </div>
    ) : null;
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>
          <span style={{ fontWeight: "500" }}>Şirket / Ofis: </span>
          {currentTenant?.name || "Seçiniz"}
        </span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 2,
              minWidth: "200px",
            }}
          >
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => {
                  switchMutation.mutate(tenant.id);
                  setIsOpen(false);
                }}
                disabled={switchMutation.isPending || tenant.id === currentTenant?.id}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  border: "none",
                  backgroundColor: tenant.id === currentTenant?.id ? "#e6f2ff" : "white",
                  cursor: tenant.id === currentTenant?.id ? "default" : "pointer",
                  opacity: switchMutation.isPending ? 0.6 : 1,
                }}
              >
                {tenant.name}
                {tenant.id === currentTenant?.id && " ✓"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

