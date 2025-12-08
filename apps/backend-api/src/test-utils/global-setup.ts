// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import { setupTestDatabase } from "./test-db.js";
import { prisma } from "../lib/prisma.js";

/**
 * Seed report definitions for tests
 */
async function seedReportDefinitions() {
  const reportDefinitions = [
    {
      code: "COMPANY_FINANCIAL_SUMMARY",
      name: "Müşteri Finansal Özeti",
      description: "Seçili müşteri için belirli tarih aralığında satış, alış ve fatura özetleri.",
      isActive: true,
    },
    {
      code: "COMPANY_RISK_SUMMARY",
      name: "Müşteri Risk Özeti",
      description: "Seçili müşteri için risk skoru, seviyeleri ve uyarı özetleri.",
      isActive: true,
    },
    {
      code: "TENANT_PORTFOLIO",
      name: "Portföy Özeti",
      description: "Tüm müşteri portföyü için risk ve aktivite özeti.",
      isActive: true,
    },
    {
      code: "DOCUMENT_ACTIVITY",
      name: "Belge ve Fatura Aktivitesi",
      description: "Belge yüklemeleri, AI analizleri ve fatura durumları.",
      isActive: true,
    },
  ];

  for (const def of reportDefinitions) {
    await prisma.reportDefinition.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        description: def.description,
        isActive: def.isActive,
      },
      create: def,
    });
  }
}

export default async function globalSetup() {
  console.log("🔧 Setting up test database...");
  await setupTestDatabase();
  
  console.log("🌱 Seeding report definitions...");
  await seedReportDefinitions();
  
  console.log("✅ Test database setup complete");
}

