import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyContracts() {
  console.log("🔍 Verifying contracts data...\n");

  // Find tenant
  const tenant = await prisma.tenant.findFirst({
    where: { name: { contains: "Örnek" } },
  });

  if (!tenant) {
    console.log("❌ No tenant found");
    process.exit(1);
  }

  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   ID: ${tenant.id}\n`);

  // Check contracts
  const contracts = await prisma.documentParsedData.findMany({
    where: {
      tenantId: tenant.id,
      documentType: "contract",
    },
    include: {
      document: {
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    take: 5,
  });

  console.log(`📄 Contracts found: ${contracts.length}`);
  contracts.forEach((contract, idx) => {
    const fields = contract.fields as any;
    console.log(`\n${idx + 1}. Contract ID: ${contract.id}`);
    console.log(`   Document ID: ${contract.documentId}`);
    console.log(`   Client: ${contract.document.clientCompany?.name || "NULL"}`);
    console.log(`   Contract Number: ${fields.contractNumber || "N/A"}`);
    console.log(`   End Date: ${fields.endDate || fields.expirationDate || "N/A"}`);
    console.log(`   Value: ${fields.value || "N/A"} ${fields.currency || ""}`);
  });

  // Check message threads
  const threads = await prisma.messageThread.findMany({
    where: {
      tenantId: tenant.id,
    },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      participants: {
        include: {
          user: {
            select: { email: true, fullName: true },
          },
        },
      },
    },
    take: 5,
  });

  console.log(`\n💬 Message threads found: ${threads.length}`);
  threads.forEach((thread, idx) => {
    console.log(`\n${idx + 1}. Thread ID: ${thread.id}`);
    console.log(`   Subject: ${thread.subject || "N/A"}`);
    console.log(`   Client Company ID: ${thread.clientCompanyId || "N/A"}`);
    console.log(`   Participants: ${thread.participants.map((p) => p.user.email).join(", ")}`);
    console.log(`   Messages: ${thread.messages.length}`);
  });

  console.log("\n✅ Verification complete!");
  console.log("\n💡 If data exists but not showing in UI:");
  console.log("   1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)");
  console.log("   2. Check browser console for errors (F12)");
  console.log("   3. Verify you're logged in with the correct tenant");
  console.log(`   4. Login with: yonetici@ornekofis1.com / demo123`);
}

verifyContracts()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

