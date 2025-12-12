"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, updateUserSettings } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";

export default function ClientSettingsPage() {
  const queryClient = useQueryClient();
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSms, setNotificationSms] = useState(false);
  const [locale, setLocale] = useState("tr-TR");

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      alert("Ayarlar başarıyla güncellendi!");
    },
    onError: (error: Error) => {
      alert(`Ayarlar güncellenirken hata oluştu: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      notificationPreferences: {
        email: notificationEmail,
        sms: notificationSms,
      },
      locale,
    });
  };

  return (
    <div>
      <PageHeader title="Ayarlar" />

      {/* Notification Preferences */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ padding: spacing.lg }}>
          <h2 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Bildirim Tercihleri</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
            <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "14px" }}>E-posta bildirimleri al</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={notificationSms}
                onChange={(e) => setNotificationSms(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "14px" }}>SMS bildirimleri al</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Display Preferences */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ padding: spacing.lg }}>
          <h2 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Görüntüleme Tercihleri</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontSize: "14px", color: colors.text.secondary }}>
                Dil
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: spacing.sm,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="tr-TR">Türkçe</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Info */}
      {currentUser && (
        <Card style={{ marginBottom: spacing.lg }}>
          <div style={{ padding: spacing.lg }}>
            <h2 style={{ fontSize: "18px", fontWeight: "semibold", marginBottom: spacing.md }}>Profil Bilgileri</h2>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: spacing.md }}>
              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>E-posta:</div>
              <div>{currentUser.user?.email || "-"}</div>

              <div style={{ color: colors.text.secondary, fontSize: "14px" }}>Ad Soyad:</div>
              <div>{currentUser.user?.fullName || "-"}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
          {updateSettingsMutation.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
      </div>
    </div>
  );
}

