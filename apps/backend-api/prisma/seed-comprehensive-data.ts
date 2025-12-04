import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function seedComprehensiveData() {
  console.log("🌱 Seeding comprehensive test data for Risk Dashboard...");

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

  // Create ledger accounts first (needed for transactions)
  const ledgerAccounts = await Promise.all([
    prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "100",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: "100",
        name: "Kasa",
        type: "asset",
        isActive: true,
      },
    }),
    prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "102",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: "102",
        name: "Banka",
        type: "asset",
        isActive: true,
      },
    }),
    prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "120",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: "120",
        name: "Alıcılar",
        type: "asset",
        isActive: true,
      },
    }),
    prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "600",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: "600",
        name: "Yurtiçi Satışlar",
        type: "income",
        isActive: true,
      },
    }),
    prisma.ledgerAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "391",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        code: "391",
        name: "Ödenecek KDV",
        type: "liability",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${ledgerAccounts.length} ledger accounts`);

  // Create more client companies (some high risk)
  const clients = await Promise.all([
    // Low risk client
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "1111111111",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "ABC Teknoloji A.Ş.",
        legalType: "Anonim",
        taxNumber: "1111111111",
        tradeRegistryNumber: "123456",
        sector: "Teknoloji",
        contactPersonName: "Ahmet Yılmaz",
        contactPhone: "+90 555 111 2233",
        contactEmail: "ahmet@abcteknoloji.com",
        address: "İstanbul, Türkiye",
        isActive: true,
      },
    }),
    // Medium risk client
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "2222222222",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "XYZ İnşaat Ltd.",
        legalType: "Limited",
        taxNumber: "2222222222",
        tradeRegistryNumber: "789012",
        sector: "İnşaat",
        contactPersonName: "Mehmet Demir",
        contactPhone: "+90 555 444 5566",
        contactEmail: "mehmet@xyzinşaat.com",
        address: "Ankara, Türkiye",
        isActive: true,
      },
    }),
    // HIGH RISK client
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "3333333333",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Risky Şirket A.Ş.",
        legalType: "Anonim",
        taxNumber: "3333333333",
        tradeRegistryNumber: "345678",
        sector: "Ticaret",
        contactPersonName: "Ali Risk",
        contactPhone: "+90 555 777 8899",
        contactEmail: "ali@riskysirket.com",
        address: "İzmir, Türkiye",
        isActive: true,
      },
    }),
    // Another HIGH RISK client
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "4444444444",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Problemli Ticaret Ltd.",
        legalType: "Limited",
        taxNumber: "4444444444",
        tradeRegistryNumber: "456789",
        sector: "Ticaret",
        contactPersonName: "Veli Problem",
        contactPhone: "+90 555 999 0000",
        contactEmail: "veli@problemli.com",
        address: "Bursa, Türkiye",
        isActive: true,
      },
    }),
    // Normal client
    prisma.clientCompany.upsert({
      where: {
        tenantId_taxNumber: {
          tenantId: tenant.id,
          taxNumber: "5555555555",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Güvenilir Hizmet A.Ş.",
        legalType: "Anonim",
        taxNumber: "5555555555",
        tradeRegistryNumber: "567890",
        sector: "Hizmet",
        contactPersonName: "Ayşe Güven",
        contactPhone: "+90 555 111 2222",
        contactEmail: "ayse@guvenilir.com",
        address: "Antalya, Türkiye",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${clients.length} client companies`);

  // Create bank accounts for clients
  const bankAccounts = await Promise.all([
    prisma.clientCompanyBankAccount.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        bankName: "Ziraat Bankası",
        iban: "TR330006100519786457841326",
        accountNumber: "19786457841326",
        currency: "TRY",
        isPrimary: true,
      },
    }),
    prisma.clientCompanyBankAccount.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[1].id,
        bankName: "İş Bankası",
        iban: "TR640006400000123456789012",
        accountNumber: "123456789012",
        currency: "TRY",
        isPrimary: true,
      },
    }),
    prisma.clientCompanyBankAccount.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        bankName: "Garanti BBVA",
        iban: "TR320001000000000000000001",
        accountNumber: "000000000001",
        currency: "TRY",
        isPrimary: true,
      },
    }),
  ]);

  console.log(`✅ Created ${bankAccounts.length} bank accounts`);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  // Create invoices - mix of normal and high risk
  const invoices = await Promise.all([
    // Normal invoice
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        externalId: "INV-2025-001",
        type: "SATIŞ",
        issueDate: today,
        dueDate: tomorrow,
        totalAmount: 1180.0,
        currency: "TRY",
        taxAmount: 180.0,
        netAmount: 1000.0,
        counterpartyName: "ABC Teknoloji A.Ş.",
        counterpartyTaxNumber: "1111111111",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Yazılım Lisansı",
              quantity: 1,
              unitPrice: 1000.0,
              lineTotal: 1000.0,
              vatRate: 0.18,
              vatAmount: 180.0,
            },
          ],
        },
      },
    }),

    // HIGH RISK: Due date before issue date
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        externalId: "INV-2025-002",
        type: "SATIŞ",
        issueDate: today,
        dueDate: yesterday, // RISK
        totalAmount: 2360.0,
        currency: "TRY",
        taxAmount: 360.0,
        netAmount: 2000.0,
        counterpartyName: "Risky Şirket A.Ş.",
        counterpartyTaxNumber: "3333333333",
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Ürün Satışı",
              quantity: 10,
              unitPrice: 200.0,
              lineTotal: 2000.0,
              vatRate: 0.18,
              vatAmount: 360.0,
            },
          ],
        },
      },
    }),

    // HIGH RISK: Missing tax number
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[3].id,
        externalId: "INV-2025-003",
        type: "SATIŞ",
        issueDate: lastWeek,
        dueDate: today,
        totalAmount: 590.0,
        currency: "TRY",
        taxAmount: 90.0,
        netAmount: 500.0,
        counterpartyName: "Problemli Ticaret Ltd.",
        counterpartyTaxNumber: null, // RISK
        status: "kesildi",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Danışmanlık Hizmeti",
              quantity: 1,
              unitPrice: 500.0,
              lineTotal: 500.0,
              vatRate: 0.18,
              vatAmount: 90.0,
            },
          ],
        },
      },
    }),

    // HIGH RISK: Duplicate invoice number
    prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        externalId: "INV-2025-001", // RISK: Duplicate
        type: "ALIŞ",
        issueDate: today,
        dueDate: tomorrow,
        totalAmount: 2360.0,
        currency: "TRY",
        taxAmount: 360.0,
        netAmount: 2000.0,
        counterpartyName: "Tedarikçi A.Ş.",
        counterpartyTaxNumber: "4444444444",
        status: "taslak",
        lines: {
          create: [
            {
              tenantId: tenant.id,
              lineNumber: 1,
              description: "Hammadde",
              quantity: 20,
              unitPrice: 100.0,
              lineTotal: 2000.0,
              vatRate: 0.18,
              vatAmount: 360.0,
            },
          ],
        },
      },
    }),

    // More invoices for the high-risk client
    ...Array.from({ length: 8 }, (_, i) =>
      prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clients[2].id, // Risky Şirket
          externalId: `INV-2025-${String(100 + i).padStart(3, "0")}`,
          type: i % 2 === 0 ? "SATIŞ" : "ALIŞ",
          issueDate: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
          dueDate: new Date(today.getTime() + (30 - i) * 24 * 60 * 60 * 1000),
          totalAmount: (1000 + i * 100) * 1.18,
          currency: "TRY",
          taxAmount: (1000 + i * 100) * 0.18,
          netAmount: 1000 + i * 100,
          counterpartyName: "Risky Şirket A.Ş.",
          counterpartyTaxNumber: i % 3 === 0 ? null : "3333333333", // Some missing tax numbers
          status: i < 3 ? "kesildi" : "taslak",
          lines: {
            create: [
              {
                tenantId: tenant.id,
                lineNumber: 1,
                description: `Ürün/Hizmet ${i + 1}`,
                quantity: 1 + i,
                unitPrice: 1000 + i * 50,
                lineTotal: (1 + i) * (1000 + i * 50),
                vatRate: 0.18,
                vatAmount: (1 + i) * (1000 + i * 50) * 0.18,
              },
            ],
          },
        },
      })
    ),

    // Normal invoices
    ...Array.from({ length: 5 }, (_, i) =>
      prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clients[0].id, // ABC Teknoloji
          externalId: `INV-2025-${String(200 + i).padStart(3, "0")}`,
          type: "SATIŞ",
          issueDate: new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(today.getTime() + (30 - i * 7) * 24 * 60 * 60 * 1000),
          totalAmount: (2000 + i * 500) * 1.18,
          currency: "TRY",
          taxAmount: (2000 + i * 500) * 0.18,
          netAmount: 2000 + i * 500,
          counterpartyName: "ABC Teknoloji A.Ş.",
          counterpartyTaxNumber: "1111111111",
          status: "kesildi",
          lines: {
            create: [
              {
                tenantId: tenant.id,
                lineNumber: 1,
                description: `Hizmet ${i + 1}`,
                quantity: 1,
                unitPrice: 2000 + i * 500,
                lineTotal: 2000 + i * 500,
                vatRate: 0.18,
                vatAmount: (2000 + i * 500) * 0.18,
              },
            ],
          },
        },
      })
    ),
  ]);

  console.log(`✅ Created ${invoices.length} invoices`);

  // Create documents (some high risk)
  const documents = await Promise.all([
    // Normal document
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        relatedInvoiceId: invoices[0].id,
        type: "INVOICE",
        originalFileName: "invoice_001.pdf",
        storagePath: `documents/${tenant.id}/invoice_001.pdf`,
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(102400),
        uploadUserId: user.id,
        uploadSource: "manual",
        status: "PROCESSED",
        processedAt: today,
      },
    }),

    // HIGH RISK document - failed processing
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        relatedInvoiceId: invoices[1].id,
        type: "INVOICE",
        originalFileName: "invoice_risky_001.pdf",
        storagePath: `documents/${tenant.id}/invoice_risky_001.pdf`,
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(204800),
        uploadUserId: user.id,
        uploadSource: "manual",
        status: "FAILED",
        processingErrorMessage: "OCR parsing failed - low confidence",
        processedAt: yesterday,
      },
    }),

    // More documents
    ...Array.from({ length: 10 }, (_, i) =>
      prisma.document.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clients[i % clients.length].id,
          relatedInvoiceId: i < invoices.length ? invoices[i].id : null,
          type: i % 3 === 0 ? "INVOICE" : i % 3 === 1 ? "BANK_STATEMENT" : "RECEIPT",
          originalFileName: `document_${String(i + 1).padStart(3, "0")}.pdf`,
          storagePath: `documents/${tenant.id}/document_${String(i + 1).padStart(3, "0")}.pdf`,
          mimeType: "application/pdf",
          fileSizeBytes: BigInt((100 + i * 50) * 1024),
          uploadUserId: user.id,
          uploadSource: "manual",
          status: i % 5 === 0 ? "FAILED" : "PROCESSED",
          processingErrorMessage: i % 5 === 0 ? "Parsing error" : null,
          processedAt: i % 5 === 0 ? null : new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        },
      })
    ),
  ]);

  console.log(`✅ Created ${documents.length} documents`);

  // Create financial transactions
  const transactions = await Promise.all([
    ...Array.from({ length: 15 }, (_, i) =>
      prisma.transaction.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clients[i % clients.length].id,
          date: new Date(today.getTime() - i * 2 * 24 * 60 * 60 * 1000),
          referenceNo: `REF-${i + 1}`,
          description: `İşlem Açıklaması ${i + 1}`,
          source: i % 3 === 0 ? "integration" : "manual",
          lines: {
            create: [
              {
                tenantId: tenant.id,
                ledgerAccountId: ledgerAccounts[0].id, // Kasa
                debitAmount: 1000 + i * 100,
                creditAmount: 0,
                description: `Borç ${i + 1}`,
              },
              {
                tenantId: tenant.id,
                ledgerAccountId: ledgerAccounts[3].id, // Yurtiçi Satışlar
                debitAmount: 0,
                creditAmount: 1000 + i * 100,
                description: `Alacak ${i + 1}`,
              },
            ],
          },
        },
      })
    ),
  ]);

  console.log(`✅ Created ${transactions.length} financial transactions`);

  // Create risk scores for documents
  const documentRiskScores = await Promise.all([
    // Low risk document
    prisma.documentRiskScore.create({
      data: {
        tenantId: tenant.id,
        documentId: documents[0].id,
        score: 15.0,
        severity: "low",
        triggeredRuleCodes: [],
        generatedAt: today,
      },
    }),

    // HIGH RISK document
    prisma.documentRiskScore.create({
      data: {
        tenantId: tenant.id,
        documentId: documents[1].id,
        score: 85.0,
        severity: "high",
        triggeredRuleCodes: ["DOC_PARSING_FAILED"],
        generatedAt: yesterday,
      },
    }),

    // More risk scores for other documents
    ...documents.slice(2, 8).map((doc, i) =>
      prisma.documentRiskScore.create({
        data: {
          tenantId: tenant.id,
          documentId: doc.id,
          score: i % 2 === 0 ? 25.0 + i * 5 : 75.0 - i * 5,
          severity: i % 2 === 0 ? "low" : "high",
          triggeredRuleCodes: i % 2 === 0 ? [] : ["INV_MISSING_TAX_NUMBER"],
          generatedAt: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        },
      })
    ),
  ]);

  console.log(`✅ Created ${documentRiskScores.length} document risk scores`);

  // Create risk scores for client companies
  const companyRiskScores = await Promise.all([
    // Low risk company
    prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[0].id,
        score: 20.0,
        severity: "low",
        triggeredRuleCodes: [],
        generatedAt: today,
      },
    }),

    // Medium risk company
    prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[1].id,
        score: 45.0,
        severity: "medium",
        triggeredRuleCodes: [],
        generatedAt: today,
      },
    }),

    // HIGH RISK company
    prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        score: 85.0,
        severity: "high",
        triggeredRuleCodes: ["COMP_MANY_HIGH_RISK_DOCS", "COMP_HIGH_RISK_RATIO"],
        generatedAt: today,
      },
    }),

    // Another HIGH RISK company
    prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[3].id,
        score: 90.0,
        severity: "high",
        triggeredRuleCodes: ["COMP_MANY_HIGH_RISK_DOCS", "COMP_FREQUENT_DUPLICATES"],
        generatedAt: today,
      },
    }),

    // Low risk company
    prisma.clientCompanyRiskScore.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[4].id,
        score: 15.0,
        severity: "low",
        triggeredRuleCodes: [],
        generatedAt: today,
      },
    }),
  ]);

  console.log(`✅ Created ${companyRiskScores.length} company risk scores`);

  // Create risk alerts
  const riskAlerts = await Promise.all([
    // Critical alert
    prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[2].id,
        documentId: documents[1].id,
        type: "document_risk",
        title: "Yüksek Riskli Belge Tespit Edildi",
        message: "Belge işleme başarısız oldu ve yüksek risk skoru üretti.",
        severity: "critical",
        status: "open",
      },
    }),

    // High alert
    prisma.riskAlert.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: clients[3].id,
        documentId: null,
        type: "company_risk",
        title: "Müşteri Yüksek Risk Kategorisinde",
        message: "Bu müşteri son 90 günde çok sayıda yüksek riskli belge üretti.",
        severity: "high",
        status: "open",
      },
    }),

    // More alerts
    ...Array.from({ length: 8 }, (_, i) =>
      prisma.riskAlert.create({
        data: {
          tenantId: tenant.id,
          clientCompanyId: clients[i % 3 === 0 ? 2 : i % 3 === 1 ? 3 : 1].id,
          documentId: i < documents.length ? documents[i].id : null,
          type: i % 2 === 0 ? "document_risk" : "company_risk",
          title: `Risk Uyarısı ${i + 1}`,
          message: `Risk analizi sonucu uyarı ${i + 1} oluşturuldu.`,
          severity: i % 3 === 0 ? "critical" : i % 3 === 1 ? "high" : "medium",
          status: i < 5 ? "open" : i < 7 ? "in_progress" : "closed",
          resolvedAt: i >= 7 ? new Date(today.getTime() - (i - 7) * 24 * 60 * 60 * 1000) : null,
          resolvedByUserId: i >= 7 ? user.id : null,
        },
      })
    ),
  ]);

  console.log(`✅ Created ${riskAlerts.length} risk alerts`);

  console.log("");
  console.log("🎉 Comprehensive test data seeded successfully!");
  console.log("");
  console.log("Summary:");
  console.log(`  • ${clients.length} client companies (2 high risk)`);
  console.log(`  • ${bankAccounts.length} bank accounts`);
  console.log(`  • ${invoices.length} invoices (some with risk issues)`);
  console.log(`  • ${documents.length} documents (some high risk)`);
  console.log(`  • ${transactions.length} financial transactions`);
  console.log(`  • ${documentRiskScores.length} document risk scores`);
  console.log(`  • ${companyRiskScores.length} company risk scores`);
  console.log(`  • ${riskAlerts.length} risk alerts`);
  console.log("");
  console.log("💡 Refresh the Risk Dashboard to see all the data!");
  console.log("   You should now see:");
  console.log("   - High Risk Customers: 2");
  console.log("   - Critical Warnings: Multiple");
  console.log("   - Total Documents: " + documents.length);
  console.log("   - High Risk Documents: Several");
  console.log("   - And much more!");
}

seedComprehensiveData()
  .catch((e) => {
    console.error("Error seeding comprehensive data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

