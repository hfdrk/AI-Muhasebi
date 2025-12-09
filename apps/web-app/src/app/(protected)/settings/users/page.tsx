"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTenantUsers, changeUserRole, updateUserStatus, getCurrentUser } from "@repo/api-client";
import { InviteUserModal } from "@/components/invite-user-modal";
import { settings as settingsTranslations } from "@repo/i18n";

const ROLE_LABELS: Record<string, string> = {
  TenantOwner: "Ofis Sahibi",
  Accountant: "Muhasebeci",
  Staff: "Personel",
  ReadOnly: "Sadece Görüntüleme",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  invited: "Davet Edildi",
  suspended: "Devre Dışı",
};

export default function UsersPage() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentTenant = userData?.data.tenants.find((t) => t.status === "active");
  const tenantId = currentTenant?.id;
  const userRole = currentTenant?.role;
  
  // Check if user can manage users (TenantOwner or Accountant)
  const canManageUsers = userRole === "TenantOwner" || userRole === "Accountant";

  const { data, isLoading } = useQuery({
    queryKey: ["tenantUsers", tenantId],
    queryFn: () => (tenantId ? listTenantUsers(tenantId) : Promise.resolve({ data: [] })),
    enabled: !!tenantId,
  });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (tenantId) {
        await changeUserRole(tenantId, userId, { role: role as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantUsers", tenantId] });
      setToastMessage(settingsTranslations.users.roleUpdated);
    },
    onError: () => {
      setToastMessage("Rol güncellenirken bir hata oluştu.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "suspended" }) => {
      if (tenantId) {
        await updateUserStatus(tenantId, userId, { status });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenantUsers", tenantId] });
      if (variables.status === "suspended") {
        setToastMessage(settingsTranslations.users.userSuspended);
      } else {
        setToastMessage(settingsTranslations.users.userReactivated);
      }
    },
    onError: () => {
      setToastMessage("Durum güncellenirken bir hata oluştu.");
    },
  });

  if (!tenantId) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Kiracı bulunamadı.</p>
      </div>
    );
  }

  const users = data?.data || [];

  return (
    <div style={{ padding: "40px" }}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            backgroundColor: "#28a745",
            color: "white",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 10000,
            maxWidth: "400px",
          }}
        >
          {toastMessage}
        </div>
      )}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Kullanıcı Yönetimi</h1>
        {canManageUsers && (
          <button
            onClick={() => setInviteModalOpen(true)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {settingsTranslations.users.inviteButton}
          </button>
        )}
      </div>
      
      {!canManageUsers && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: "4px",
            marginBottom: "24px",
            border: "1px solid #ffc107",
          }}
        >
          {settingsTranslations.users.viewOnlyMessage}
        </div>
      )}

      {isLoading ? (
        <p>Yükleniyor...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Ad Soyad</th>
              <th style={{ padding: "12px", textAlign: "left" }}>E-posta</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Rol</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Oluşturulma Tarihi</th>
              <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{user.name || user.fullName}</td>
                <td style={{ padding: "12px" }}>{user.email}</td>
                <td style={{ padding: "12px" }}>
                  {canManageUsers ? (
                    <select
                      value={user.role}
                      onChange={(e) => changeRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                      disabled={changeRoleMutation.isPending}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{ROLE_LABELS[user.role] || user.role}</span>
                  )}
                </td>
                <td style={{ padding: "12px" }}>{STATUS_LABELS[user.status] || user.status}</td>
                <td style={{ padding: "12px" }}>
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td style={{ padding: "12px" }}>
                  {canManageUsers && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          userId: user.id,
                          status: user.status === "active" ? "suspended" : "active",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: user.status === "active" ? "#dc3545" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {user.status === "active"
                        ? settingsTranslations.users.suspendButton
                        : settingsTranslations.users.reactivateButton}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <InviteUserModal
        tenantId={tenantId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          setToastMessage(settingsTranslations.users.inviteSuccess);
        }}
      />
    </div>
  );
}

