import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { hashPassword } from "@repo/shared-utils";

const prisma = new PrismaClient();

async function seedMessagingAndContracts() {
  console.log("🌱 Seeding messaging, contracts, and example data...");

  // Get or create demo tenant - try multiple possible slugs
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: "ornekofis1" },
        { slug: "ornek-muhasebe-ofisi-1" },
        { slug: "demo-ofis" },
        { name: { contains: "Örnek" } },
      ],
    },
  });

  if (!tenant) {
    console.log("Creating demo tenant...");
    tenant = await prisma.tenant.create({
      data: {
        name: "Örnek Muhasebe Ofisi 1",
        slug: "ornek-muhasebe-ofisi-1",
        taxNumber: "1234567890",
        email: "info@ornekofis1.com",
        phone: "+90 212 123 45 67",
      },
    });
  } else {
    console.log(`Using existing tenant: ${tenant.name} (${tenant.slug})`);
  }

  // Get or create admin user
  let adminUser = await prisma.user.findFirst({
    where: { email: "yonetici@ornekofis1.com" },
  });

  if (!adminUser) {
    console.log("Creating admin user...");
    const hashedPassword = await hashPassword("demo123");
    
    adminUser = await prisma.user.create({
      data: {
        email: "yonetici@ornekofis1.com",
        hashedPassword,
        fullName: "Yönetici Kullanıcı",
        locale: "tr-TR",
        isActive: true,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: "TenantOwner",
            status: "active",
          },
        },
      },
    });
  }

  // Get or create accountant user
  let accountantUser = await prisma.user.findFirst({
    where: { email: "muhasebeci@ornekofis1.com" },
  });

  if (!accountantUser) {
    console.log("Creating accountant user...");
    const hashedPassword = await hashPassword("demo123");
    
    accountantUser = await prisma.user.create({
      data: {
        email: "muhasebeci@ornekofis1.com",
        hashedPassword,
        fullName: "Muhasebeci Kullanıcı",
        locale: "tr-TR",
        isActive: true,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: "Accountant",
            status: "active",
          },
        },
      },
    });
  }

  // Create client companies
  const clientCompanies = [];
  const clientNames = [
    { name: "ABC Teknoloji A.Ş.", email: "info@abcteknoloji.com", taxNumber: "1111111111" },
    { name: "XYZ İnşaat Ltd.", email: "iletisim@xyzinşaat.com", taxNumber: "2222222222" },
    { name: "DEF Ticaret A.Ş.", email: "info@defticaret.com", taxNumber: "3333333333" },
  ];

  for (const clientData of clientNames) {
    let clientCompany = await prisma.clientCompany.findFirst({
      where: {
        tenantId: tenant.id,
        taxNumber: clientData.taxNumber,
      },
    });

    if (!clientCompany) {
      clientCompany = await prisma.clientCompany.create({
        data: {
          tenantId: tenant.id,
          name: clientData.name,
          taxNumber: clientData.taxNumber,
          legalType: "AS",
          contactEmail: clientData.email,
          contactPhone: "+90 555 123 45 67",
          address: "İstanbul, Türkiye",
          isActive: true,
        },
      });
      console.log(`✅ Created client: ${clientData.name}`);
    }
    clientCompanies.push(clientCompany);
  }

  // Create ReadOnly users for clients (for messaging)
  const readonlyUsers = [];
  for (const clientCompany of clientCompanies) {
    let readonlyUser = await prisma.user.findFirst({
      where: { email: clientCompany.contactEmail },
    });

    if (!readonlyUser) {
      const hashedPassword = await hashPassword("demo123");
      
      readonlyUser = await prisma.user.create({
        data: {
          email: clientCompany.contactEmail,
          hashedPassword,
          fullName: clientCompany.name + " Kullanıcısı",
          locale: "tr-TR",
          isActive: true,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: "ReadOnly",
              status: "active",
            },
          },
        },
      });
      console.log(`✅ Created ReadOnly user: ${readonlyUser.email}`);
    }
    readonlyUsers.push(readonlyUser);
  }

  // Create contract documents
  console.log("📄 Creating contract documents...");
  const contracts = [];
  const contractData = [
    {
      clientCompany: clientCompanies[0],
      contractNumber: "SOZ-2024-001",
      contractDate: "2024-01-15",
      startDate: "2024-01-15",
      endDate: "2025-01-14", // Expires in ~30 days (if today is around Dec 15, 2024)
      expirationDate: "2025-01-14",
      value: 50000,
      currency: "TRY",
      contractType: "Hizmet Sözleşmesi",
      parties: [
        { name: "ABC Teknoloji A.Ş.", role: "Müşteri", taxNumber: "1111111111" },
        { name: "Örnek Ofis 1", role: "Hizmet Sağlayıcı", taxNumber: "1234567890" },
      ],
      terms: "Yıllık hizmet sözleşmesi",
      renewalTerms: "Otomatik yenileme, 30 gün önceden bildirim",
    },
    {
      clientCompany: clientCompanies[1],
      contractNumber: "SOZ-2024-002",
      contractDate: "2024-03-01",
      startDate: "2024-03-01",
      endDate: "2024-12-31", // Expired
      expirationDate: "2024-12-31",
      value: 75000,
      currency: "TRY",
      contractType: "İnşaat Sözleşmesi",
      parties: [
        { name: "XYZ İnşaat Ltd.", role: "Müşteri", taxNumber: "2222222222" },
        { name: "Örnek Ofis 1", role: "Danışman", taxNumber: "1234567890" },
      ],
      terms: "6 aylık danışmanlık sözleşmesi",
      renewalTerms: "Yenileme için yazılı onay gerekli",
    },
    {
      clientCompany: clientCompanies[2],
      contractNumber: "SOZ-2024-003",
      contractDate: "2024-06-01",
      startDate: "2024-06-01",
      endDate: "2025-06-01", // Expires in ~6 months
      expirationDate: "2025-06-01",
      value: 100000,
      currency: "TRY",
      contractType: "Ticari Sözleşme",
      parties: [
        { name: "DEF Ticaret A.Ş.", role: "Müşteri", taxNumber: "3333333333" },
        { name: "Örnek Ofis 1", role: "Hizmet Sağlayıcı", taxNumber: "1234567890" },
      ],
      terms: "Yıllık ticari danışmanlık",
      renewalTerms: "Otomatik yenileme",
    },
  ];

  for (const contractInfo of contractData) {
    // Create document
    const fileName = `sozlesme-${contractInfo.contractNumber}.pdf`;
    const document = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        clientCompanyId: contractInfo.clientCompany.id,
        originalFileName: fileName,
        mimeType: "application/pdf",
        fileSizeBytes: BigInt(102400),
        type: "CONTRACT",
        storagePath: `/storage/contracts/${fileName}`,
        uploadUserId: adminUser.id,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    // Create parsed contract data
    const parsedData = await prisma.documentParsedData.create({
      data: {
        tenantId: tenant.id,
        documentId: document.id,
        documentType: "contract",
        fields: {
          contractNumber: contractInfo.contractNumber,
          contractDate: contractInfo.contractDate,
          startDate: contractInfo.startDate,
          endDate: contractInfo.endDate,
          expirationDate: contractInfo.expirationDate,
          value: contractInfo.value,
          currency: contractInfo.currency,
          contractType: contractInfo.contractType,
          parties: contractInfo.parties,
          terms: contractInfo.terms,
          renewalTerms: contractInfo.renewalTerms,
        },
        parserVersion: "1.0",
      },
    });

    contracts.push({ document, parsedData });
    console.log(`✅ Created contract: ${contractInfo.contractNumber}`);
  }

  // Create message threads
  console.log("💬 Creating message threads...");
  const messageThreads = [];

  // Thread 1: Admin to Client 1
  const thread1 = await prisma.messageThread.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0].id,
      subject: "Fatura Sorusu",
    },
  });

  // Add participants
  await prisma.messageThreadParticipant.createMany({
    data: [
      { threadId: thread1.id, userId: adminUser.id },
      { threadId: thread1.id, userId: readonlyUsers[0].id },
    ],
  });

  await prisma.message.create({
    data: {
      threadId: thread1.id,
      senderId: adminUser.id,
      content: "Merhaba, Ocak ayı faturaları hakkında bir sorum var. Lütfen bana dönüş yapabilir misiniz?",
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread1.id,
      senderId: readonlyUsers[0].id,
      content: "Merhaba, tabii ki. Hangi konuda yardımcı olabilirim?",
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread1.id,
      senderId: adminUser.id,
      content: "Ocak ayı faturasında bir tutarsızlık görüyorum. Kontrol edebilir misiniz?",
    },
  });

  // Update thread last message time
  await prisma.messageThread.update({
    where: { id: thread1.id },
    data: { lastMessageAt: new Date() },
  });

  messageThreads.push(thread1);
  console.log(`✅ Created message thread: ${thread1.subject}`);

  // Thread 2: Accountant to Client 2
  const thread2 = await prisma.messageThread.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[1].id,
      subject: "Sözleşme Yenileme",
    },
  });

  await prisma.messageThreadParticipant.createMany({
    data: [
      { threadId: thread2.id, userId: accountantUser.id },
      { threadId: thread2.id, userId: readonlyUsers[1].id },
    ],
  });

  await prisma.message.create({
    data: {
      threadId: thread2.id,
      senderId: accountantUser.id,
      content: "Sözleşmenizin süresi yakında dolacak. Yenileme konusunda görüşmek ister misiniz?",
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread2.id,
      senderId: readonlyUsers[1].id,
      content: "Evet, tabii. Ne zaman uygun olursunuz?",
    },
  });

  await prisma.messageThread.update({
    where: { id: thread2.id },
    data: { lastMessageAt: new Date() },
  });

  messageThreads.push(thread2);
  console.log(`✅ Created message thread: ${thread2.subject}`);

  // Thread 3: Admin to Client 3 (unread messages)
  const thread3 = await prisma.messageThread.create({
    data: {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[2].id,
      subject: "Yeni Hizmet Teklifi",
    },
  });

  await prisma.messageThreadParticipant.createMany({
    data: [
      { threadId: thread3.id, userId: adminUser.id },
      { threadId: thread3.id, userId: readonlyUsers[2].id },
    ],
  });

  await prisma.message.create({
    data: {
      threadId: thread3.id,
      senderId: readonlyUsers[2].id,
      content: "Yeni hizmet paketleriniz hakkında bilgi almak istiyorum.",
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread3.id,
      senderId: readonlyUsers[2].id,
      content: "Lütfen detaylı bir teklif gönderebilir misiniz?",
    },
  });

  await prisma.messageThread.update({
    where: { id: thread3.id },
    data: { lastMessageAt: new Date() },
  });

  messageThreads.push(thread3);
  console.log(`✅ Created message thread: ${thread3.subject} (with unread messages)`);

  console.log("\n✅ Seeding completed!");
  console.log("\n📊 Summary:");
  console.log(`   - Tenant: ${tenant.name}`);
  console.log(`   - Users: ${adminUser.email}, ${accountantUser.email}`);
  console.log(`   - Client Companies: ${clientCompanies.length}`);
  console.log(`   - ReadOnly Users: ${readonlyUsers.length}`);
  console.log(`   - Contracts: ${contracts.length}`);
  console.log(`   - Message Threads: ${messageThreads.length}`);
  console.log("\n🔑 Login Credentials:");
  console.log(`   Admin: yonetici@ornekofis1.com / demo123`);
  console.log(`   Accountant: muhasebeci@ornekofis1.com / demo123`);
  console.log(`   Client 1: ${readonlyUsers[0].email} / demo123`);
  console.log(`   Client 2: ${readonlyUsers[1].email} / demo123`);
  console.log(`   Client 3: ${readonlyUsers[2].email} / demo123`);
}

seedMessagingAndContracts()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
