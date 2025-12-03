"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTenantUsers, changeUserRole, updateUserStatus, getCurrentUser } from "@repo/api-client";
import { InviteUserModal } from "../../../components/invite-user-modal";

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
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentTenant = userData?.data.tenants.find((t) => t.status === "active");
  const tenantId = currentTenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["tenantUsers", tenantId],
    queryFn: () => (tenantId ? listTenantUsers(tenantId) : Promise.resolve({ data: [] })),
    enabled: !!tenantId,
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      tenantId ? changeUserRole(tenantId, userId, { role: role as any }) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantUsers", tenantId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "active" | "suspended" }) =>
      tenantId ? updateUserStatus(tenantId, userId, { status }) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantUsers", tenantId] });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>Kullanıcı Yönetimi</h1>
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
          Davet Gönder
        </button>
      </div>

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
                <td style={{ padding: "12px" }}>{user.fullName}</td>
                <td style={{ padding: "12px" }}>{user.email}</td>
                <td style={{ padding: "12px" }}>
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
                </td>
                <td style={{ padding: "12px" }}>{STATUS_LABELS[user.status] || user.status}</td>
                <td style={{ padding: "12px" }}>
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td style={{ padding: "12px" }}>
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
                    {user.status === "active" ? "Devre Dışı Bırak" : "Aktif Et"}
                  </button>
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
      />
    </div>
  );
}

