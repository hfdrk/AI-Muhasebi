/**
 * Seed Notifications Data
 * 
 * Creates comprehensive demo data for notifications:
 * - RISK_ALERT notifications
 * - SCHEDULED_REPORT notifications
 * - INTEGRATION_SYNC notifications
 * - SYSTEM notifications
 * - Notification preferences for users
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedNotificationsData() {
  console.log("🌱 Seeding notifications data...\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Get users
  const users = await prisma.userTenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      status: "active",
    },
    include: {
      user: true,
    },
    take: 5,
  });

  console.log(`✅ Found ${users.length} users\n`);

  // Get client companies for risk alerts
  const clientCompanies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    take: 3,
  });

  // Get risk alerts
  const riskAlerts = await prisma.riskAlert.findMany({
    where: {
      tenantId: tenant.id,
      status: "open",
    },
    take: 3,
  });

  // Get scheduled reports
  const scheduledReports = await prisma.scheduledReport.findMany({
    where: {
      tenantId: tenant.id,
    },
    take: 3,
  });

  // Get integrations
  const integrations = await prisma.tenantIntegration.findMany({
    where: {
      tenantId: tenant.id,
    },
    take: 2,
  });

  const now = new Date();
  let notificationCount = 0;

  // 1. RISK_ALERT Notifications
  console.log("⚠️  Creating RISK_ALERT notifications...");
  for (let i = 0; i < Math.min(5, riskAlerts.length + 2); i++) {
    const user = users[i % users.length];
    const company = clientCompanies[i % clientCompanies.length];
    
    const notification = await prisma.notification.create({
      data: {
        tenantId: tenant.id,
        userId: user.userId,
        type: "RISK_ALERT",
        title: i === 0 
          ? "Yüksek Risk Skoru Tespit Edildi"
          : i === 1
          ? "Kritik Risk Uyarısı"
          : "Orta Seviye Risk Tespit Edildi",
        message: i === 0
          ? `${company.name} için yüksek seviye risk skoru hesaplandı. Lütfen inceleme yapın.`
          : i === 1
          ? `${company.name} için kritik risk uyarısı oluşturuldu. Acil müdahale gerekiyor.`
          : `${company.name} için orta seviye risk skoru tespit edildi.`,
        meta: {
          alertId: riskAlerts[i % riskAlerts.length]?.id || `alert-${i}`,
          clientCompanyId: company.id,
          severity: i === 0 ? "high" : i === 1 ? "critical" : "medium",
        },
        is_read: i > 2, // First 3 are unread
        read_at: i > 2 ? new Date(now.getTime() - (i - 2) * 60 * 60 * 1000) : null,
        createdAt: new Date(now.getTime() - (i + 1) * 2 * 60 * 60 * 1000),
      },
    });
    notificationCount++;
    console.log(`   ✅ ${notification.title} (${notification.is_read ? 'read' : 'unread'})`);
  }

  // 2. SCHEDULED_REPORT Notifications
  console.log("\n📊 Creating SCHEDULED_REPORT notifications...");
  for (let i = 0; i < Math.min(4, scheduledReports.length + 1); i++) {
    const user = users[i % users.length];
    const report = scheduledReports[i % scheduledReports.length];
    
    const isSuccess = i < 3;
    const notification = await prisma.notification.create({
      data: {
        tenantId: tenant.id,
        userId: user.userId,
        type: "SCHEDULED_REPORT",
        title: isSuccess
          ? "Zamanlanmış Rapor Hazır"
          : "Rapor Oluşturma Hatası",
        message: isSuccess
          ? `${report.name} raporu başarıyla oluşturuldu ve e-posta ile gönderildi.`
          : `${report.name} raporu oluşturulurken bir hata oluştu. Lütfen kontrol edin.`,
        meta: {
          reportId: report.id,
          reportCode: report.reportCode,
          status: isSuccess ? "success" : "failed",
        },
        is_read: i > 1,
        read_at: i > 1 ? new Date(now.getTime() - (i - 1) * 3 * 60 * 60 * 1000) : null,
        createdAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
      },
    });
    notificationCount++;
    console.log(`   ✅ ${notification.title} (${notification.is_read ? 'read' : 'unread'})`);
  }

  // 3. INTEGRATION_SYNC Notifications
  console.log("\n🔌 Creating INTEGRATION_SYNC notifications...");
  for (let i = 0; i < Math.min(4, integrations.length + 1); i++) {
    const user = users[i % users.length];
    const integration = integrations[i % integrations.length];
    
    const isSuccess = i < 2;
    const notification = await prisma.notification.create({
      data: {
        tenantId: tenant.id,
        userId: user.userId,
        type: "INTEGRATION_SYNC",
        title: isSuccess
          ? "Entegrasyon Senkronizasyonu Tamamlandı"
          : "Entegrasyon Senkronizasyonu Başarısız",
        message: isSuccess
          ? `${integration.displayName} entegrasyonu için senkronizasyon başarıyla tamamlandı.`
          : `${integration.displayName} entegrasyonu için senkronizasyon başarısız oldu. Lütfen kontrol edin.`,
        meta: {
          integrationId: integration.id,
          status: isSuccess ? "success" : "failed",
        },
        is_read: i > 1,
        read_at: i > 1 ? new Date(now.getTime() - (i - 1) * 4 * 60 * 60 * 1000) : null,
        createdAt: new Date(now.getTime() - (i + 1) * 6 * 60 * 60 * 1000),
      },
    });
    notificationCount++;
    console.log(`   ✅ ${notification.title} (${notification.is_read ? 'read' : 'unread'})`);
  }

  // 4. SYSTEM Notifications
  console.log("\n🔔 Creating SYSTEM notifications...");
  const systemNotifications = [
    {
      title: "Sistem Güncellemesi",
      message: "Yeni özellikler eklendi: Gelişmiş risk analizi ve raporlama özellikleri artık kullanılabilir.",
      meta: { version: "2.1.0", features: ["risk_analysis", "reporting"] },
    },
    {
      title: "Bakım Bildirimi",
      message: "Sistem bakımı 15 Ocak 2025 tarihinde 02:00-04:00 saatleri arasında yapılacaktır.",
      meta: { maintenanceDate: "2025-01-15", startTime: "02:00", endTime: "04:00" },
    },
    {
      title: "Yeni Entegrasyon Eklendi",
      message: "Mikro Muhasebe entegrasyonu artık kullanılabilir. Ayarlar sayfasından yapılandırabilirsiniz.",
      meta: { integrationType: "accounting", provider: "Mikro Muhasebe" },
    },
  ];

  for (let i = 0; i < systemNotifications.length; i++) {
    const user = users[i % users.length];
    const notif = systemNotifications[i];
    
    const notification = await prisma.notification.create({
      data: {
        tenantId: tenant.id,
        userId: user.userId,
        type: "SYSTEM",
        title: notif.title,
        message: notif.message,
        meta: notif.meta,
        is_read: i > 0,
        read_at: i > 0 ? new Date(now.getTime() - i * 12 * 60 * 60 * 1000) : null,
        createdAt: new Date(now.getTime() - (i + 1) * 48 * 60 * 60 * 1000),
      },
    });
    notificationCount++;
    console.log(`   ✅ ${notification.title} (${notification.is_read ? 'read' : 'unread'})`);
  }

  // 5. Create Notification Preferences for users
  console.log("\n⚙️  Creating notification preferences...");
  let preferenceCount = 0;

  for (const membership of users) {
    const existing = await prisma.notificationPreference.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: membership.userId,
        },
      },
    });

    if (!existing) {
      await prisma.notificationPreference.create({
        data: {
          tenantId: tenant.id,
          userId: membership.userId,
          email_enabled: true,
          in_app_enabled: true,
        },
      });
      preferenceCount++;
      console.log(`   ✅ Preferences for ${membership.user.email}`);
    } else {
      console.log(`   ⏭️  Preferences already exist for ${membership.user.email}`);
    }
  }

  // Summary
  console.log("\n📊 Summary:");
  console.log(`   Total Notifications: ${notificationCount}`);
  console.log(`   - RISK_ALERT: ${Math.min(5, riskAlerts.length + 2)}`);
  console.log(`   - SCHEDULED_REPORT: ${Math.min(4, scheduledReports.length + 1)}`);
  console.log(`   - INTEGRATION_SYNC: ${Math.min(4, integrations.length + 1)}`);
  console.log(`   - SYSTEM: ${systemNotifications.length}`);
  console.log(`   Notification Preferences: ${preferenceCount} created`);
  
  // Count unread
  const unreadCount = await prisma.notification.count({
    where: {
      tenantId: tenant.id,
      is_read: false,
    },
  });
  console.log(`   Unread Notifications: ${unreadCount}`);
  
  console.log("\n✅ Notifications data seeded successfully!");
}

seedNotificationsData()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
