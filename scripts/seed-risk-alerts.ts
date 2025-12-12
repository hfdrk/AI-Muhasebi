/**
 * Seed Risk Alerts Data
 * 
 * Creates comprehensive demo data for risk alerts (Risk Warnings):
 * - Various severities: low, medium, high, critical
 * - Various statuses: open, in_progress, closed, ignored
 * - Different types: RISK_THRESHOLD_EXCEEDED, ANOMALY_DETECTED
 * - Linked to client companies and documents
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRiskAlerts() {
  console.log("🌱 Seeding risk alerts data...\n");

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!tenant) {
    console.error("❌ No active tenant found");
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Get client companies
  const clientCompanies = await prisma.clientCompany.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    take: 6,
  });

  console.log(`✅ Found ${clientCompanies.length} client companies\n`);

  // Get high-risk documents
  const highRiskDocuments = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      riskScore: {
        severity: "high",
      },
    },
    include: {
      riskScore: true,
    },
    take: 5,
  });

  console.log(`✅ Found ${highRiskDocuments.length} high-risk documents\n`);

  // Get users for resolvedByUserId
  const users = await prisma.userTenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      status: "active",
    },
    include: {
      user: true,
    },
    take: 2,
  });

  const now = new Date();
  let alertCount = 0;

  // 1. CRITICAL Severity Alerts (Open)
  console.log("🔴 Creating CRITICAL severity alerts...");
  const criticalAlerts = [
    {
      company: clientCompanies[0],
      document: highRiskDocuments[0],
      title: "Kritik Risk: Yüksek Risk Skoru Aşıldı",
      message: `${clientCompanies[0].name} için risk skoru kritik seviyeye ulaştı (${highRiskDocuments[0].riskScore?.score || 95}). Acil müdahale gerekiyor.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "open",
    },
    {
      company: clientCompanies[1],
      document: highRiskDocuments[1],
      title: "Kritik Anomali Tespit Edildi",
      message: `${clientCompanies[1].name} için beklenmedik bir anomali tespit edildi. Fatura tutarlarında %300 artış gözlemlendi.`,
      type: "ANOMALY_DETECTED",
      status: "open",
    },
  ];

  for (const alert of criticalAlerts) {
    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: alert.company.id,
        documentId: alert.document?.id || null,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: "critical",
        status: alert.status,
        createdAt: new Date(now.getTime() - (alertCount + 1) * 2 * 60 * 60 * 1000),
      },
    });
    alertCount++;
    console.log(`   ✅ ${alert.title} (${alert.status})`);
  }

  // 2. HIGH Severity Alerts
  console.log("\n🟠 Creating HIGH severity alerts...");
  const highAlerts = [
    {
      company: clientCompanies[2],
      document: highRiskDocuments[2],
      title: "Yüksek Risk: Belge İşleme Hatası",
      message: `${clientCompanies[2].name} için yüklenen belgelerde işleme hataları tespit edildi. Risk skoru: ${highRiskDocuments[2]?.riskScore?.score || 85}.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "open",
    },
    {
      company: clientCompanies[0],
      document: highRiskDocuments[0],
      title: "Yüksek Risk: Eksik Belgeler",
      message: `${clientCompanies[0].name} için gerekli belgeler eksik. Bu durum risk skorunu artırıyor.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "in_progress",
    },
    {
      company: clientCompanies[3],
      document: null,
      title: "Yüksek Risk: Tutarsız Veri",
      message: `${clientCompanies[3].name} için fatura ve işlem verileri arasında tutarsızlık tespit edildi.`,
      type: "ANOMALY_DETECTED",
      status: "open",
    },
    {
      company: clientCompanies[1],
      document: highRiskDocuments[1],
      title: "Yüksek Risk: Şüpheli İşlem",
      message: `${clientCompanies[1].name} için şüpheli işlem kalıpları tespit edildi. Detaylı inceleme önerilir.`,
      type: "ANOMALY_DETECTED",
      status: "in_progress",
    },
  ];

  for (const alert of highAlerts) {
    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: alert.company.id,
        documentId: alert.document?.id || null,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: "high",
        status: alert.status,
        createdAt: new Date(now.getTime() - (alertCount + 1) * 4 * 60 * 60 * 1000),
      },
    });
    alertCount++;
    console.log(`   ✅ ${alert.title} (${alert.status})`);
  }

  // 3. MEDIUM Severity Alerts
  console.log("\n🟡 Creating MEDIUM severity alerts...");
  const mediumAlerts = [
    {
      company: clientCompanies[4],
      document: null,
      title: "Orta Risk: Gecikmiş Belge Yükleme",
      message: `${clientCompanies[4].name} için belge yükleme sürelerinde gecikme var. Normal seviyeye dönmesi bekleniyor.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "open",
    },
    {
      company: clientCompanies[2],
      document: highRiskDocuments[2],
      title: "Orta Risk: Düşük Güven Skoru",
      message: `${clientCompanies[2].name} için belge güven skoru düşük seviyede. İyileştirme önerilir.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "closed",
      resolvedBy: users[0]?.userId,
    },
    {
      company: clientCompanies[5],
      document: null,
      title: "Orta Risk: Olağandışı Aktivite",
      message: `${clientCompanies[5].name} için olağandışı aktivite tespit edildi. İzleme altında.`,
      type: "ANOMALY_DETECTED",
      status: "open",
    },
  ];

  for (const alert of mediumAlerts) {
    const resolvedAt = alert.status === "closed" 
      ? new Date(now.getTime() - (alertCount + 1) * 6 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
      : null;

    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: alert.company.id,
        documentId: alert.document?.id || null,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: "medium",
        status: alert.status,
        resolvedAt,
        resolvedByUserId: alert.resolvedBy || null,
        createdAt: new Date(now.getTime() - (alertCount + 1) * 6 * 60 * 60 * 1000),
      },
    });
    alertCount++;
    console.log(`   ✅ ${alert.title} (${alert.status})`);
  }

  // 4. LOW Severity Alerts
  console.log("\n🟢 Creating LOW severity alerts...");
  const lowAlerts = [
    {
      company: clientCompanies[0],
      document: null,
      title: "Düşük Risk: Bilgilendirme",
      message: `${clientCompanies[0].name} için küçük bir tutarsızlık tespit edildi. Otomatik olarak düzeltilecek.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "open",
    },
    {
      company: clientCompanies[3],
      document: null,
      title: "Düşük Risk: Rutin Kontrol",
      message: `${clientCompanies[3].name} için rutin risk kontrolü yapıldı. Her şey normal görünüyor.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      status: "closed",
      resolvedBy: users[0]?.userId,
    },
    {
      company: clientCompanies[4],
      document: null,
      title: "Düşük Risk: İyileştirme Önerisi",
      message: `${clientCompanies[4].name} için belge kalitesini artırmak için öneriler mevcut.`,
      type: "ANOMALY_DETECTED",
      status: "ignored",
    },
  ];

  for (const alert of lowAlerts) {
    const resolvedAt = alert.status === "closed" 
      ? new Date(now.getTime() - (alertCount + 1) * 12 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000)
      : null;

    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: alert.company.id,
        documentId: alert.document?.id || null,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: "low",
        status: alert.status,
        resolvedAt,
        resolvedByUserId: alert.resolvedBy || null,
        createdAt: new Date(now.getTime() - (alertCount + 1) * 12 * 60 * 60 * 1000),
      },
    });
    alertCount++;
    console.log(`   ✅ ${alert.title} (${alert.status})`);
  }

  // 5. Older resolved alerts (for history)
  console.log("\n📜 Creating historical resolved alerts...");
  const historicalAlerts = [
    {
      company: clientCompanies[1],
      document: null,
      title: "Yüksek Risk: Çözüldü",
      message: `${clientCompanies[1].name} için önceki risk uyarısı çözüldü.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      severity: "high",
      status: "closed",
      resolvedBy: users[0]?.userId,
      daysAgo: 3,
    },
    {
      company: clientCompanies[2],
      document: null,
      title: "Orta Risk: Çözüldü",
      message: `${clientCompanies[2].name} için orta seviye risk uyarısı çözüldü.`,
      type: "ANOMALY_DETECTED",
      severity: "medium",
      status: "closed",
      resolvedBy: users[1]?.userId,
      daysAgo: 5,
    },
    {
      company: clientCompanies[5],
      document: null,
      title: "Düşük Risk: Çözüldü",
      message: `${clientCompanies[5].name} için düşük seviye risk uyarısı çözüldü.`,
      type: "RISK_THRESHOLD_EXCEEDED",
      severity: "low",
      status: "closed",
      resolvedBy: users[0]?.userId,
      daysAgo: 7,
    },
  ];

  for (const alert of historicalAlerts) {
    const createdAt = new Date(now.getTime() - alert.daysAgo * 24 * 60 * 60 * 1000);
    const resolvedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

    await prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: alert.company.id,
        documentId: alert.document?.id || null,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        status: alert.status,
        resolvedAt,
        resolvedByUserId: alert.resolvedBy || null,
        createdAt,
      },
    });
    alertCount++;
    console.log(`   ✅ ${alert.title} (${alert.daysAgo} days ago)`);
  }

  // Summary
  const summary = await prisma.riskAlert.groupBy({
    by: ["severity", "status"],
    where: { tenantId: tenant.id },
    _count: true,
  });

  console.log("\n📊 Summary:");
  console.log(`   Total Risk Alerts: ${alertCount}`);
  
  const severityCounts = await prisma.riskAlert.groupBy({
    by: ["severity"],
    where: { tenantId: tenant.id },
    _count: true,
  });

  console.log("\n   By Severity:");
  severityCounts.forEach((s) => {
    console.log(`     ${s.severity}: ${s._count}`);
  });

  const statusCounts = await prisma.riskAlert.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
  });

  console.log("\n   By Status:");
  statusCounts.forEach((s) => {
    console.log(`     ${s.status}: ${s._count}`);
  });

  const openCount = await prisma.riskAlert.count({
    where: {
      tenantId: tenant.id,
      status: "open",
    },
  });

  console.log(`\n   Open Alerts: ${openCount}`);
  console.log("\n✅ Risk alerts data seeded successfully!");
}

seedRiskAlerts()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
