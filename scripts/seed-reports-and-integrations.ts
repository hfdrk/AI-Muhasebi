/**
 * Seed Reports and Integrations Data
 * 
 * Creates comprehensive demo data for:
 * - Report Definitions
 * - Tenant Integrations
 * - Integration Sync Jobs
 * - Integration Sync Logs
 * - Scheduled Reports
 * - Report Execution Logs
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedReportsAndIntegrations() {
  console.log("🌱 Seeding reports and integrations data...\n");

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
    take: 5,
  });

  console.log(`✅ Found ${clientCompanies.length} client companies\n`);

  // Get integration providers
  const providers = await prisma.integrationProvider.findMany({
    where: { isActive: true },
  });

  console.log(`✅ Found ${providers.length} integration providers\n`);

  // 1. Create Report Definitions
  console.log("📊 Creating report definitions...");
  const reportDefinitions = [
    {
      code: "COMPANY_FINANCIAL_SUMMARY",
      name: "Müşteri Finansal Özeti",
      description: "Seçili müşteri için belirli tarih aralığında finansal özet raporu (gelir, gider, faturalar, işlemler)",
    },
    {
      code: "COMPANY_RISK_SUMMARY",
      name: "Müşteri Risk Özeti",
      description: "Seçili müşteri için risk skorları, uyarılar ve risk göstergeleri özeti",
    },
    {
      code: "TENANT_PORTFOLIO",
      name: "Portföy Özeti",
      description: "Tüm müşteriler için portföy seviyesinde özet rapor (toplam gelir, risk dağılımı, istatistikler)",
    },
    {
      code: "DOCUMENT_ACTIVITY",
      name: "Belge Aktivite Raporu",
      description: "Belge yükleme, işleme ve aktivite istatistikleri raporu",
    },
    {
      code: "MONTHLY_SUMMARY",
      name: "Aylık Özet Raporu",
      description: "Aylık finansal ve operasyonel özet raporu",
    },
    {
      code: "RISK_SUMMARY",
      name: "Risk Özet Raporu",
      description: "Genel risk analizi ve uyarı özeti",
    },
  ];

  for (const def of reportDefinitions) {
    await prisma.reportDefinition.upsert({
      where: { code: def.code },
      update: {},
      create: def,
    });
    console.log(`   ✅ ${def.name}`);
  }

  // 2. Create Tenant Integrations
  console.log("\n🔌 Creating tenant integrations...");
  const accountingProviders = providers.filter((p) => p.type === "accounting");
  const bankProviders = providers.filter((p) => p.type === "bank");

  const integrations = [];

  // Accounting integrations for client companies
  for (let i = 0; i < Math.min(3, clientCompanies.length); i++) {
    const company = clientCompanies[i];
    const provider = accountingProviders[i % accountingProviders.length];

    const integration = await prisma.tenantIntegration.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: company.id,
        providerId: provider.id,
        status: i === 2 ? "error" : "connected",
        displayName: `${provider.name} - ${company.name}`,
        config: {
          apiKey: `demo_api_key_${i + 1}`,
          apiSecret: `demo_secret_${i + 1}`,
          companyId: `COMP_${i + 1}`,
        },
        lastSyncAt: i === 2 ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : new Date(),
        lastSyncStatus: i === 2 ? "error" : "success",
      },
    });

    integrations.push(integration);
    console.log(`   ✅ ${integration.displayName} (${integration.status})`);
  }

  // Bank integration (no client company)
  if (bankProviders.length > 0) {
    const bankIntegration = await prisma.tenantIntegration.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: null,
        providerId: bankProviders[0].id,
        status: "connected",
        displayName: `${bankProviders[0].name} - Ana Hesap`,
        config: {
          clientId: "demo_bank_client_123",
          clientSecret: "demo_bank_secret_456",
          accountNumber: "1234567890",
        },
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
      },
    });

    integrations.push(bankIntegration);
    console.log(`   ✅ ${bankIntegration.displayName}`);
  }

  // 3. Create Integration Sync Jobs
  console.log("\n⚙️  Creating integration sync jobs...");
  const now = new Date();
  const syncJobs = [];

  for (const integration of integrations) {
    // Successful job
    const successJob = await prisma.integrationSyncJob.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: integration.clientCompanyId,
        tenantIntegrationId: integration.id,
        jobType: integration.clientCompanyId ? "pull_invoices" : "pull_bank_transactions",
        status: "success",
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
      },
    });
    syncJobs.push(successJob);

    // Failed job (for error status integration)
    if (integration.status === "error") {
      const failedJob = await prisma.integrationSyncJob.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: integration.clientCompanyId,
          tenantIntegrationId: integration.id,
          jobType: "pull_invoices",
          status: "failed",
          startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          finishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 1000),
          errorMessage: "API bağlantı hatası: Geçersiz kimlik bilgileri",
        },
      });
      syncJobs.push(failedJob);
    }

    // In-progress job (for connected integrations)
    if (integration.status === "connected") {
      const inProgressJob = await prisma.integrationSyncJob.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: integration.clientCompanyId,
          tenantIntegrationId: integration.id,
          jobType: integration.clientCompanyId ? "pull_invoices" : "pull_bank_transactions",
          status: "in_progress",
          startedAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
      });
      syncJobs.push(inProgressJob);
    }
  }

  console.log(`   ✅ Created ${syncJobs.length} sync jobs`);

  // 4. Create Integration Sync Logs
  console.log("\n📝 Creating integration sync logs...");
  let logCount = 0;

  for (const job of syncJobs) {
    // Start log
    await prisma.integrationSyncLog.create({
      data: {
        tenantId: tenant.id,
        tenantIntegrationId: job.tenantIntegrationId,
        level: "info",
        message: "Senkronizasyon başlatıldı",
        context: {
          jobId: job.id,
          jobType: job.jobType,
          startedAt: job.startedAt,
        },
      },
    });
    logCount++;

    // Success/Error log
    if (job.status === "success" && job.finishedAt) {
      await prisma.integrationSyncLog.create({
        data: {
          tenantId: tenant.id,
          tenantIntegrationId: job.tenantIntegrationId,
          level: "info",
          message: job.jobType === "pull_invoices" ? "Faturalar başarıyla çekildi" : "Banka işlemleri başarıyla çekildi",
          context: {
            jobId: job.id,
            recordsCreated: Math.floor(Math.random() * 20) + 5,
            recordsUpdated: Math.floor(Math.random() * 10) + 1,
          },
        },
      });
      logCount++;
    } else if (job.status === "failed" && job.finishedAt) {
      await prisma.integrationSyncLog.create({
        data: {
          tenantId: tenant.id,
          tenantIntegrationId: job.tenantIntegrationId,
          level: "error",
          message: "Senkronizasyon hatası",
          context: {
            jobId: job.id,
            error: job.errorMessage,
            errorCode: "SYNC_FAILED",
          },
        },
      });
      logCount++;
    }
  }

  console.log(`   ✅ Created ${logCount} sync logs`);

  // 5. Create Scheduled Reports
  console.log("\n📅 Creating scheduled reports...");
  const reportCodes = ["COMPANY_FINANCIAL_SUMMARY", "COMPANY_RISK_SUMMARY", "TENANT_PORTFOLIO", "MONTHLY_SUMMARY"];

  const scheduledReports = [];

  // Company-specific reports
  for (let i = 0; i < Math.min(2, clientCompanies.length); i++) {
    const company = clientCompanies[i];
    const report = await prisma.scheduledReport.create({
      data: {
        tenantId: tenant.id,
        reportCode: reportCodes[i % reportCodes.length],
        clientCompanyId: company.id,
        name: `${company.name} - ${i === 0 ? "Aylık Finansal Özet" : "Haftalık Risk Özeti"}`,
        format: i === 0 ? "pdf" : "excel",
        scheduleCron: i === 0 ? "0 0 1 * *" : "0 0 * * 1", // Monthly or weekly
        filters: {
          start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        },
        recipients: ["yonetici@ornekofis1.com", "muhasebeci@ornekofis1.com"],
        isActive: true,
        lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastRunStatus: "success",
      },
    });
    scheduledReports.push(report);
    console.log(`   ✅ ${report.name}`);
  }

  // Portfolio report (no client company)
  const portfolioReport = await prisma.scheduledReport.create({
    data: {
      tenantId: tenant.id,
      reportCode: "TENANT_PORTFOLIO",
      clientCompanyId: null,
      name: "Portföy Özet Raporu - Aylık",
      format: "pdf",
      scheduleCron: "0 0 1 * *",
      filters: {
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      },
      recipients: ["yonetici@ornekofis1.com"],
      isActive: true,
      lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastRunStatus: "success",
    },
  });
  scheduledReports.push(portfolioReport);
  console.log(`   ✅ ${portfolioReport.name}`);

  // 6. Create Report Execution Logs
  console.log("\n📋 Creating report execution logs...");
  const user = await prisma.user.findFirst({
    where: { email: "yonetici@ornekofis1.com" },
  });

  let execLogCount = 0;

  for (const report of scheduledReports) {
    // Recent successful execution
    await prisma.reportExecutionLog.create({
      data: {
        tenantId: tenant.id,
        scheduledReportId: report.id,
        reportCode: report.reportCode,
        startedAt: report.lastRunAt!,
        finishedAt: new Date(report.lastRunAt!.getTime() + 5 * 60 * 1000),
        status: "success",
        message: "Rapor başarıyla oluşturuldu ve e-posta ile gönderildi",
        createdByUserId: user?.id,
      },
    });
    execLogCount++;

    // Older execution
    await prisma.reportExecutionLog.create({
      data: {
        tenantId: tenant.id,
        scheduledReportId: report.id,
        reportCode: report.reportCode,
        startedAt: new Date(report.lastRunAt!.getTime() - 30 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(report.lastRunAt!.getTime() - 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        status: "success",
        message: "Rapor başarıyla oluşturuldu ve e-posta ile gönderildi",
      },
    });
    execLogCount++;
  }

  // On-demand report (no scheduled report)
  await prisma.reportExecutionLog.create({
    data: {
      tenantId: tenant.id,
      scheduledReportId: null,
      reportCode: "COMPANY_FINANCIAL_SUMMARY",
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      finishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
      status: "success",
      message: "Anlık rapor başarıyla oluşturuldu",
      createdByUserId: user?.id,
    },
  });
  execLogCount++;

  console.log(`   ✅ Created ${execLogCount} execution logs`);

  // Summary
  console.log("\n📊 Summary:");
  console.log(`   Report Definitions: ${reportDefinitions.length}`);
  console.log(`   Tenant Integrations: ${integrations.length}`);
  console.log(`   Sync Jobs: ${syncJobs.length}`);
  console.log(`   Sync Logs: ${logCount}`);
  console.log(`   Scheduled Reports: ${scheduledReports.length}`);
  console.log(`   Report Execution Logs: ${execLogCount}`);
  console.log("\n✅ Reports and integrations data seeded successfully!");
}

seedReportsAndIntegrations()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
