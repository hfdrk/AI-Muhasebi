import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedNotifications() {
  console.log("🌱 Seeding notifications data...");

  // Get the test tenant and user
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "test-sirketi" },
  });

  const user = await prisma.user.findFirst({
    where: { email: "test@example.com" },
  });

  if (!tenant || !user) {
    console.error("❌ Test tenant or user not found. Please run seed-users.ts first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name}`);
  console.log(`✅ Found user: ${user.email}`);

  // Get a client company for context (if exists)
  const clientCompany = await prisma.clientCompany.findFirst({
    where: { tenantId: tenant.id },
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Create notifications of different types
  const notifications = [
    // RISK_ALERT notifications
    {
      tenantId: tenant.id,
      userId: null, // Tenant-wide
      type: "RISK_ALERT",
      title: "Yeni risk uyarısı",
      message: clientCompany
        ? `${clientCompany.name} için yüksek riskli bir belge tespit edildi.`
        : "Yüksek riskli bir belge tespit edildi.",
      meta: clientCompany
        ? {
            riskAlertId: "sample-risk-alert-1",
            clientCompanyId: clientCompany.id,
          }
        : { riskAlertId: "sample-risk-alert-1" },
      is_read: false,
      created_at: oneHourAgo,
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "RISK_ALERT",
      title: "Yeni risk uyarısı",
      message: "Müşteri şirketi için risk skoru kritik seviyeye ulaştı.",
      meta: {
        riskAlertId: "sample-risk-alert-2",
        severity: "critical",
      },
      is_read: false,
      created_at: oneDayAgo,
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "RISK_ALERT",
      title: "Yeni risk uyarısı",
      message: "Anomali tespit edildi: Fatura tutarlarında beklenmedik değişiklik.",
      meta: {
        riskAlertId: "sample-risk-alert-3",
        type: "ANOMALY_DETECTED",
      },
      is_read: true,
      read_at: oneDayAgo,
      created_at: threeDaysAgo,
    },
    // SCHEDULED_REPORT notifications
    {
      tenantId: tenant.id,
      userId: null, // Tenant-wide
      type: "SCHEDULED_REPORT",
      title: "Zamanlanmış rapor çalıştırma hatası",
      message: "Aylık Finansal Özet raporu çalıştırılırken bir hata oluştu.",
      meta: {
        scheduledReportId: "sample-scheduled-report-1",
        executionLogId: "sample-execution-log-1",
        reportCode: "COMPANY_FINANCIAL_SUMMARY",
      },
      is_read: false,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "SCHEDULED_REPORT",
      title: "Zamanlanmış rapor çalıştırma hatası",
      message: "Portföy Özeti raporu çalıştırılırken bir hata oluştu: Veritabanı bağlantı hatası.",
      meta: {
        scheduledReportId: "sample-scheduled-report-2",
        executionLogId: "sample-execution-log-2",
        reportCode: "TENANT_PORTFOLIO",
      },
      is_read: true,
      read_at: oneDayAgo,
      created_at: oneDayAgo,
    },
    // INTEGRATION_SYNC notifications
    {
      tenantId: tenant.id,
      userId: null, // Tenant-wide
      type: "INTEGRATION_SYNC",
      title: "Entegrasyon senkronizasyon hatası",
      message: "Muhasebe Sistemi entegrasyonu için senkronizasyon başarısız oldu.",
      meta: {
        integrationId: "sample-integration-1",
        jobId: "sample-job-1",
        providerName: "Muhasebe Sistemi",
      },
      is_read: false,
      created_at: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "INTEGRATION_SYNC",
      title: "Entegrasyon senkronizasyon hatası",
      message: "Banka Entegrasyonu için senkronizasyon başarısız oldu: API anahtarı geçersiz.",
      meta: {
        integrationId: "sample-integration-2",
        jobId: "sample-job-2",
        providerName: "Banka Entegrasyonu",
      },
      is_read: false,
      created_at: oneDayAgo,
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "INTEGRATION_SYNC",
      title: "Entegrasyon senkronizasyon hatası",
      message: "E-Fatura entegrasyonu için senkronizasyon başarısız oldu.",
      meta: {
        integrationId: "sample-integration-3",
        jobId: "sample-job-3",
      },
      is_read: true,
      read_at: threeDaysAgo,
      created_at: threeDaysAgo,
    },
    // SYSTEM notifications
    {
      tenantId: tenant.id,
      userId: null, // Tenant-wide
      type: "SYSTEM",
      title: "Sistem Bakımı",
      message: "Sistem bakımı 15 Aralık 2025 tarihinde 02:00-04:00 saatleri arasında yapılacaktır.",
      meta: {
        maintenanceDate: "2025-12-15",
        startTime: "02:00",
        endTime: "04:00",
      },
      is_read: false,
      created_at: oneDayAgo,
    },
    {
      tenantId: tenant.id,
      userId: user.id,
      type: "SYSTEM",
      title: "Yeni Özellik",
      message: "Bildirimler sistemi aktif edildi. Artık önemli olaylar hakkında anında bilgilendirileceksiniz.",
      meta: {
        feature: "notifications",
        version: "1.0.0",
      },
      is_read: true,
      read_at: oneDayAgo,
      created_at: threeDaysAgo,
    },
  ];

  // Create notifications
  let createdCount = 0;
  let skippedCount = 0;

  for (const notificationData of notifications) {
    try {
      // Check if similar notification already exists (to avoid duplicates on re-run)
      const existing = await prisma.notification.findFirst({
        where: {
          tenantId: notificationData.tenantId,
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          createdAt: {
            gte: new Date(notificationData.created_at.getTime() - 60 * 60 * 1000), // Within 1 hour
            lte: new Date(notificationData.created_at.getTime() + 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.notification.create({
        data: {
          tenantId: notificationData.tenantId,
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          meta: notificationData.meta as any,
          is_read: notificationData.is_read,
          read_at: notificationData.read_at || null,
          createdAt: notificationData.created_at,
          updatedAt: notificationData.created_at,
        },
      });

      createdCount++;
    } catch (error: any) {
      console.error(`Error creating notification: ${error.message}`);
    }
  }

  console.log(`✅ Created ${createdCount} notifications`);
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped ${skippedCount} duplicate notifications`);
  }

  // Show summary
  const unreadCount = await prisma.notification.count({
    where: {
      tenantId: tenant.id,
      OR: [{ userId: user.id }, { userId: null }],
      is_read: false,
    },
  });

  const totalCount = await prisma.notification.count({
    where: {
      tenantId: tenant.id,
      OR: [{ userId: user.id }, { userId: null }],
    },
  });

  console.log("");
  console.log("📊 Notification Summary:");
  console.log(`   Total notifications: ${totalCount}`);
  console.log(`   Unread notifications: ${unreadCount}`);
  console.log("");
  console.log("✅ Notifications seeded successfully!");
  console.log("");
  console.log("You can now:");
  console.log("  1. Visit http://localhost:3000/bildirimler to see the notifications page");
  console.log("  2. Click the bell icon in the header to see the notification dropdown");
}

seedNotifications()
  .catch((e) => {
    console.error("❌ Error seeding notifications:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


