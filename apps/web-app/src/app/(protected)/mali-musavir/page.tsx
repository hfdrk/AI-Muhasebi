"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maliMusavirClient } from "@repo/api-client";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { colors, spacing, borderRadius, typography, transitions } from "../../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

export default function MaliMusavirDashboardPage() {
  const { themeColors } = useTheme();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const queryClient = useQueryClient();

  // Mesleki Gelisim state
  const [cpdHoursInput, setCpdHoursInput] = useState<string>("");
  const [masakTrainingDateInput, setMasakTrainingDateInput] = useState<string>("");

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["mali-musavir-dashboard"],
    queryFn: () => maliMusavirClient.getDashboard(),
  });

  const dashboard = dashboardData?.data;

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    licenseType: "SMMM" as "SMMM" | "YMM",
    licenseNumber: "",
    turmobNumber: "",
    chamberName: "",
    specializations: [] as string[],
    insuranceProvider: "",
    insuranceAmount: 0,
  });

  const profileMutation = useMutation({
    mutationFn: () => maliMusavirClient.upsertProfile(profileForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mali-musavir-dashboard"] });
      setShowProfileForm(false);
    },
  });

  const cpdHoursMutation = useMutation({
    mutationFn: (hours: number) => maliMusavirClient.updateCpdHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mali-musavir-dashboard"] });
      setCpdHoursInput("");
    },
  });

  const masakTrainingMutation = useMutation({
    mutationFn: (trainingDate: string) => maliMusavirClient.updateMasakTraining(trainingDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mali-musavir-dashboard"] });
      setMasakTrainingDateInput("");
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Skeleton height="40px" width="300px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing.lg, marginTop: spacing.xl }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><div style={{ padding: spacing.lg }}><Skeleton height="120px" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: themeColors.text.primary, margin: 0 }}>
            Mali Müşavir Paneli
          </h1>
          <p style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary, margin: `${spacing.xs} 0 0` }}>
            Profesyonel yönetim ve uyumluluk merkezi
          </p>
        </div>
        {!dashboard?.profile && (
          <Button onClick={() => setShowProfileForm(true)}>
            Profil Oluştur
          </Button>
        )}
      </div>

      {/* Profile Card */}
      {dashboard?.profile && (
        <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
          <div style={{ padding: spacing.lg, background: `linear-gradient(135deg, ${colors.primaryLighter} 0%, ${themeColors.white} 100%)` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
                  <span style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: borderRadius.full,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}>
                    {dashboard.profile.licenseType}
                  </span>
                  <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                    Sicil No: {dashboard.profile.licenseNumber}
                  </span>
                </div>
                {dashboard.profile.chamberName && (
                  <div style={{ fontSize: typography.fontSize.sm, color: themeColors.text.secondary }}>
                    {dashboard.profile.chamberName}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Aktif Müşteri</div>
                <div style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.primary }}>{dashboard.clientCount}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: spacing.xl, marginTop: spacing.md }}>
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>SPE Saatleri</div>
                <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold }}>{dashboard.profile.cpdHoursCompleted} saat</div>
              </div>
              {dashboard.profile.masakTrainingDate && (
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Son MASAK Eğitimi</div>
                  <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold }}>
                    {new Date(dashboard.profile.masakTrainingDate).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Mesleki Gelisim (Professional Development) Section */}
      {dashboard?.profile && (
        <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, margin: `0 0 ${spacing.md}` }}>
              Mesleki Gelisim
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.xl }}>
              {/* CPD Hours Update */}
              <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
                <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginBottom: spacing.xs }}>
                  Mevcut SPE Saatleri
                </div>
                <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary, marginBottom: spacing.md }}>
                  {dashboard.profile.cpdHoursCompleted} saat
                </div>
                <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="Yeni saat..."
                    value={cpdHoursInput}
                    onChange={(e) => setCpdHoursInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${themeColors.border}`,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const hours = Number(cpdHoursInput);
                      if (!isNaN(hours) && hours >= 0) {
                        cpdHoursMutation.mutate(hours);
                      }
                    }}
                    disabled={!cpdHoursInput || isNaN(Number(cpdHoursInput)) || cpdHoursMutation.isPending}
                  >
                    {cpdHoursMutation.isPending ? "Kaydediliyor..." : "Guncelle"}
                  </Button>
                </div>
                {cpdHoursMutation.isError && (
                  <div style={{ color: colors.danger, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                    Hata: {(cpdHoursMutation.error as Error).message}
                  </div>
                )}
                {cpdHoursMutation.isSuccess && (
                  <div style={{ color: colors.success, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                    SPE saatleri basariyla guncellendi.
                  </div>
                )}
              </div>

              {/* MASAK Training Date Update */}
              <div style={{ padding: spacing.md, backgroundColor: themeColors.gray[50], borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
                <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginBottom: spacing.xs }}>
                  Son MASAK Egitim Tarihi
                </div>
                <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary, marginBottom: spacing.md }}>
                  {dashboard.profile.masakTrainingDate
                    ? new Date(dashboard.profile.masakTrainingDate).toLocaleDateString("tr-TR")
                    : "Kayit Yok"}
                </div>
                <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                  <input
                    type="date"
                    value={masakTrainingDateInput}
                    onChange={(e) => setMasakTrainingDateInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${themeColors.border}`,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (masakTrainingDateInput) {
                        masakTrainingMutation.mutate(masakTrainingDateInput);
                      }
                    }}
                    disabled={!masakTrainingDateInput || masakTrainingMutation.isPending}
                  >
                    {masakTrainingMutation.isPending ? "Kaydediliyor..." : "Guncelle"}
                  </Button>
                </div>
                {masakTrainingMutation.isError && (
                  <div style={{ color: colors.danger, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                    Hata: {(masakTrainingMutation.error as Error).message}
                  </div>
                )}
                {masakTrainingMutation.isSuccess && (
                  <div style={{ color: colors.success, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                    MASAK egitim tarihi basariyla guncellendi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Module Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing.lg, marginBottom: spacing.xl }}>
        {/* MASAK Card */}
        <Link href="/masak" style={{ textDecoration: "none" }}>
          <Card variant="elevated" style={{ cursor: "pointer", transition: `transform ${transitions.normal}` }}>
            <div style={{ padding: spacing.lg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, margin: 0 }}>MASAK</h3>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>Detaylar →</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Toplam</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{dashboard?.masak?.total || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Bekleyen</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.warning }}>{dashboard?.masak?.pending || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Gecikmiş</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.danger }}>{dashboard?.masak?.overdue || 0}</div>
                </div>
              </div>
            </div>
          </Card>
        </Link>

        {/* KURGAN Card */}
        <Link href="/kurgan" style={{ textDecoration: "none" }}>
          <Card variant="elevated" style={{ cursor: "pointer", transition: `transform ${transitions.normal}` }}>
            <div style={{ padding: spacing.lg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, margin: 0 }}>KURGAN</h3>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>Detaylar →</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Toplam</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{dashboard?.kurgan?.total || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Yeni</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.warning }}>{dashboard?.kurgan?.newSignals || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Kritik</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.danger }}>{dashboard?.kurgan?.critical || 0}</div>
                </div>
              </div>
            </div>
          </Card>
        </Link>

        {/* Ba-Bs Card */}
        <Link href="/babs" style={{ textDecoration: "none" }}>
          <Card variant="elevated" style={{ cursor: "pointer", transition: `transform ${transitions.normal}` }}>
            <div style={{ padding: spacing.lg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, margin: 0 }}>Ba-Bs Formları</h3>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>Detaylar →</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Toplam</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{dashboard?.babs?.total || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Taslak</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.gray[600] }}>{dashboard?.babs?.draft || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Uyumsuz</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.danger }}>{dashboard?.babs?.mismatched || 0}</div>
                </div>
              </div>
            </div>
          </Card>
        </Link>

        {/* Beyanname Card */}
        <Link href="/beyanname" style={{ textDecoration: "none" }}>
          <Card variant="elevated" style={{ cursor: "pointer", transition: `transform ${transitions.normal}` }}>
            <div style={{ padding: spacing.lg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: themeColors.text.primary, margin: 0 }}>Beyanname</h3>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>Detaylar →</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Toplam</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{dashboard?.beyanname?.total || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Taslak</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.gray[600] }}>{dashboard?.beyanname?.draft || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted }}>Gecikmiş</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.danger }}>{dashboard?.beyanname?.overdue || 0}</div>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Upcoming Deadlines */}
      {dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 && (
        <Card variant="elevated">
          <div style={{ padding: spacing.lg }}>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.md}` }}>
              Yaklaşan Tüm Süreler
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              {dashboard.upcomingDeadlines.map((d: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: themeColors.gray[50], border: `1px solid ${themeColors.border}` }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                      <span style={{
                        padding: `2px ${spacing.sm}`,
                        borderRadius: borderRadius.full,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        backgroundColor: d.type === "masak" ? `${colors.danger}20` : `${colors.primary}20`,
                        color: d.type === "masak" ? colors.danger : colors.primary,
                        textTransform: "uppercase",
                      }}>
                        {d.type}
                      </span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{d.clientCompanyName}</span>
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: themeColors.text.muted, marginTop: "2px" }}>{d.description}</div>
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: new Date(d.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? colors.danger : themeColors.text.primary,
                  }}>
                    {new Date(d.dueDate).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Profile Creation Form Modal */}
      {showProfileForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <Card variant="elevated" style={{ width: "500px", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ padding: spacing.xl }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.lg}` }}>Mali Müşavir Profili</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                <div>
                  <label style={{ display: "block", fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>Ruhsat Türü</label>
                  <select value={profileForm.licenseType} onChange={(e) => setProfileForm({ ...profileForm, licenseType: e.target.value as "SMMM" | "YMM" })} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }}>
                    <option value="SMMM">SMMM</option>
                    <option value="YMM">YMM</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>Sicil No</label>
                  <input value={profileForm.licenseNumber} onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>TÜRMOB No</label>
                  <input value={profileForm.turmobNumber} onChange={(e) => setProfileForm({ ...profileForm, turmobNumber: e.target.value })} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>Oda Adı</label>
                  <input value={profileForm.chamberName} onChange={(e) => setProfileForm({ ...profileForm, chamberName: e.target.value })} style={{ width: "100%", padding: spacing.sm, borderRadius: borderRadius.md, border: `1px solid ${themeColors.border}` }} />
                </div>
                <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.md }}>
                  <Button onClick={() => profileMutation.mutate()} disabled={!profileForm.licenseNumber || profileMutation.isPending}>
                    {profileMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowProfileForm(false)}>İptal</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
