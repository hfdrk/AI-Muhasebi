import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRiskRules() {
  console.log("Seeding risk rules...");

  // Document-level rules
  const documentRules = [
    {
      tenantId: null, // Global rule
      scope: "document",
      code: "INV_DUE_BEFORE_ISSUE",
      description: "Vade tarihi, fatura tarihinden önce.",
      weight: 30,
      isActive: true,
      defaultSeverity: "high",
      config: {},
    },
    {
      tenantId: null,
      scope: "document",
      code: "INV_TOTAL_MISMATCH",
      description: "Fatura toplamı satır toplamları ile uyuşmuyor.",
      weight: 30,
      isActive: true,
      defaultSeverity: "high",
      config: {},
    },
    {
      tenantId: null,
      scope: "document",
      code: "INV_DUPLICATE_NUMBER",
      description: "Aynı fatura numarası daha önce kullanılmış.",
      weight: 30,
      isActive: true,
      defaultSeverity: "high",
      config: {},
    },
    {
      tenantId: null,
      scope: "document",
      code: "INV_MISSING_TAX_NUMBER",
      description: "Karşı taraf vergi numarası eksik.",
      weight: 15,
      isActive: true,
      defaultSeverity: "medium",
      config: {},
    },
    {
      tenantId: null,
      scope: "document",
      code: "DOC_PARSING_FAILED",
      description: "Belge AI analizi tam olarak yapılamadı.",
      weight: 15,
      isActive: true,
      defaultSeverity: "medium",
      config: {},
    },
  ];

  // Company-level rules
  const companyRules = [
    {
      tenantId: null,
      scope: "company",
      code: "COMP_MANY_HIGH_RISK_DOCS",
      description: "Son 90 günde çok sayıda yüksek riskli belge tespit edildi.",
      weight: 25,
      isActive: true,
      defaultSeverity: "high",
      config: {
        threshold: 5,
        days: 90,
      },
    },
    {
      tenantId: null,
      scope: "company",
      code: "COMP_HIGH_RISK_RATIO",
      description: "Yüksek riskli faturaların toplam faturalara oranı çok yüksek.",
      weight: 25,
      isActive: true,
      defaultSeverity: "high",
      config: {
        threshold: 0.3, // 30%
      },
    },
    {
      tenantId: null,
      scope: "company",
      code: "COMP_FREQUENT_DUPLICATES",
      description: "Son 90 günde sık tekrarlanan fatura numaraları tespit edildi.",
      weight: 30,
      isActive: true,
      defaultSeverity: "high",
      config: {
        threshold: 3,
        days: 90,
      },
    },
  ];

  // Upsert document rules
  for (const rule of documentRules) {
    // Check if rule exists
    const existing = await prisma.riskRule.findFirst({
      where: {
        tenantId: rule.tenantId,
        code: rule.code,
      },
    });

    if (existing) {
      await prisma.riskRule.update({
        where: { id: existing.id },
        data: {
          description: rule.description,
          weight: rule.weight,
          isActive: rule.isActive,
          defaultSeverity: rule.defaultSeverity,
          config: rule.config,
        },
      });
    } else {
      await prisma.riskRule.create({
        data: rule,
      });
    }
  }

  // Upsert company rules
  for (const rule of companyRules) {
    // Check if rule exists
    const existing = await prisma.riskRule.findFirst({
      where: {
        tenantId: rule.tenantId,
        code: rule.code,
      },
    });

    if (existing) {
      await prisma.riskRule.update({
        where: { id: existing.id },
        data: {
          description: rule.description,
          weight: rule.weight,
          isActive: rule.isActive,
          defaultSeverity: rule.defaultSeverity,
          config: rule.config,
        },
      });
    } else {
      await prisma.riskRule.create({
        data: rule,
      });
    }
  }

  console.log(`Seeded ${documentRules.length} document rules and ${companyRules.length} company rules.`);
}

seedRiskRules()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

