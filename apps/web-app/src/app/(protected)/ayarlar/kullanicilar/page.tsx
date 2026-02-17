"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTenantUsers, changeUserRole, updateUserStatus, getCurrentUser } from "@repo/api-client";
import { InviteUserModal } from "@/components/invite-user-modal";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing, colors } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import { settings as settingsTranslations } from "@repo/i18n";

const ROLE_LABELS: Record<string, string> = {
  TenantOwner: "Muhasebeci", // Accountant - full access
  Accountant: "Muhasebeci", // Deprecated - shown for backward compatibility
  Staff: "Personel", // Deprecated - shown for backward compatibility
  ReadOnly: "Müşteri", // Customer - view-only access
};

// Only these two roles should be available for new users
const AVAILABLE_ROLES = ["TenantOwner", "ReadOnly"] as const;

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  invited: "Davet Edildi",
  suspended: "Devre Dışı",
};

export default function UsersPage() {
  const { themeColors } = useTheme();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentTenant = userData?.data?.tenants?.find((t) => t.status === "active");
  const tenantId = currentTenant?.id;
  const userRole = currentTenant?.role;
  
  // Check if user can manage users (only TenantOwner/Accountant role)
  const canManageUsers = userRole === "TenantOwner" || userRole === "Accountant";

  const { data, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["tenantUsers", tenantId],
    queryFn: () => (tenantId ? listTenantUsers(tenantId) : Promise.resolve({ data: [] })),
    enabled: !!tenantId,
  });

  const isLoading = isLoadingUser || isLoadingUsers;

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

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.xxl }}>
            <Skeleton height="40px" width="300px" style={{ marginBottom: spacing.md }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </PageTransition>
    );
  }

  // Show error if no tenant found
  if (!tenantId) {
    return (
      <div style={{ padding: "40px" }}>
        <p>Kiracı bulunamadı.</p>
        {userData?.data?.tenants && userData.data.tenants.length > 0 && (
          <p style={{ marginTop: "8px", color: themeColors.text.secondary, fontSize: "14px" }}>
            Aktif bir kiracı bulunamadı. Lütfen bir kiracı seçin veya yöneticinizle iletişime geçin.
          </p>
        )}
      </div>
    );
  }

  const users = data?.data || [];

  return (
    <PageTransition>
      <div style={{ padding: "40px" }}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            backgroundColor: colors.success,
            color: colors.white,
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
              backgroundColor: colors.primary,
              color: colors.white,
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
            backgroundColor: colors.warningLight,
            color: colors.warningDark,
            borderRadius: "4px",
            marginBottom: "24px",
            border: `1px solid ${colors.warning}`,
          }}
        >
          {settingsTranslations.users.viewOnlyMessage}
        </div>
      )}

      {isLoading ? (
        <Card>
          <div style={{ padding: spacing.lg }}>
            <SkeletonTable rows={5} columns={5} />
          </div>
        </Card>
      ) : users.length === 0 ? (
        <p style={{ color: themeColors.text.secondary, padding: "20px" }}>Henüz kullanıcı bulunmuyor.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Ad Soyad</th>
              <th style={{ padding: "12px", textAlign: "left" }}>E-posta</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Rol</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Şirket</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Durum</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Oluşturulma Tarihi</th>
              <th style={{ padding: "12px", textAlign: "left" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: `1px solid ${themeColors.gray[200]}` }}>
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
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: "4px",
                        backgroundColor: user.role === "ReadOnly" ? colors.primaryLighter : themeColors.white,
                      }}
                    >
                      {AVAILABLE_ROLES.map((value) => (
                        <option key={value} value={value}>
                          {ROLE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: user.role === "ReadOnly" ? colors.primaryLighter : "transparent",
                        fontWeight: user.role === "ReadOnly" ? 500 : 400,
                      }}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px" }}>
                  {user.role === "ReadOnly" && user.companyName ? (
                    <span style={{ color: themeColors.text.secondary, fontSize: "14px" }}>{user.companyName}</span>
                  ) : (
                    <span style={{ color: themeColors.text.muted, fontStyle: "italic" }}>—</span>
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
                        backgroundColor: user.status === "active" ? colors.danger : colors.success,
                        color: colors.white,
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
    </PageTransition>
  );
}

