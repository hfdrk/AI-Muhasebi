import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTasks() {
  console.log("🌱 Seeding demo tasks...");

  // Get user - try yonetici@ornekofis1.com first, fallback to test@example.com
  let user = await prisma.user.findFirst({
    where: { email: "yonetici@ornekofis1.com" },
  });

  if (!user) {
    console.log("⚠️  yonetici@ornekofis1.com not found, trying test@example.com...");
    user = await prisma.user.findFirst({
      where: { email: "test@example.com" },
    });
  }

  if (!user) {
    console.error("❌ User not found. Please run seed-users.ts first.");
    process.exit(1);
  }

  // Get tenant - if yonetici@ornekofis1.com, get from membership, otherwise use test-sirketi
  let tenant;
  if (user.email === "yonetici@ornekofis1.com") {
    const membership = await prisma.userTenantMembership.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });
    if (membership) {
      tenant = membership.tenant;
      console.log(`✅ Using tenant from user membership: ${tenant.name}`);
    } else {
      console.error("❌ User membership not found for yonetici@ornekofis1.com");
      process.exit(1);
    }
  } else {
    tenant = await prisma.tenant.findFirst({
      where: { slug: "test-sirketi" },
    });
    if (!tenant) {
      console.error("❌ Test tenant not found. Please run seed-users.ts first.");
      process.exit(1);
    }
  }

  // Get client companies
  const clientCompanies = await prisma.clientCompany.findMany({
    where: { tenantId: tenant.id, isActive: true },
    take: 3,
  });

  if (clientCompanies.length === 0) {
    console.error("❌ No client companies found. Please run seed-test-data.ts first.");
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name}`);
  console.log(`✅ Found user: ${user.email}`);
  console.log(`✅ Found ${clientCompanies.length} client companies`);

  // Create demo tasks with various statuses, priorities, and due dates
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const tasks = [
    // High priority, overdue tasks
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0]?.id || null,
      assignedToUserId: user.id,
      title: "Acil: Yüksek riskli belgeleri incele",
      description: "ABC Teknoloji A.Ş. için yüksek risk skorlu belgeleri gözden geçir ve gerekli düzenlemeleri yap.",
      status: "pending",
      priority: "high",
      dueDate: yesterday,
    },
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0]?.id || null,
      assignedToUserId: user.id,
      title: "Eksik belgeleri tamamla",
      description: "Müşteri için eksik kalan fatura ve belgeleri topla ve sisteme yükle.",
      status: "in_progress",
      priority: "high",
      dueDate: yesterday,
    },
    // Medium priority, due soon
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[1]?.id || null,
      assignedToUserId: user.id,
      title: "Aylık mali raporu hazırla",
      description: "Ocak ayı için müşteri mali raporunu oluştur ve gözden geçir.",
      status: "in_progress",
      priority: "medium",
      dueDate: tomorrow,
    },
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0]?.id || null,
      assignedToUserId: null, // Unassigned task
      title: "Risk analizi raporunu gözden geçir",
      description: "Son risk analizi sonuçlarını kontrol et ve gerekli aksiyonları belirle.",
      status: "pending",
      priority: "medium",
      dueDate: tomorrow,
    },
    // Low priority, future tasks
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[2]?.id || null,
      assignedToUserId: user.id,
      title: "Müşteri ile toplantı planla",
      description: "Yeni dönem için müşteri ile görüşme planı yap ve takvime ekle.",
      status: "pending",
      priority: "low",
      dueDate: nextWeek,
    },
    {
      tenantId: tenant.id,
      clientCompanyId: null, // General task, not assigned to a client
      assignedToUserId: user.id,
      title: "Sistem güncellemelerini kontrol et",
      description: "Yeni özellikler ve güncellemeleri incele, eğitim materyallerini hazırla.",
      status: "pending",
      priority: "low",
      dueDate: nextWeek,
    },
    // Completed tasks
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0]?.id || null,
      assignedToUserId: user.id,
      title: "Fatura doğrulama işlemlerini tamamla",
      description: "Geçen hafta yüklenen faturaların doğrulama işlemlerini tamamla.",
      status: "completed",
      priority: "medium",
      dueDate: lastWeek,
      completedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000), // Completed 2 days after due date
    },
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[1]?.id || null,
      assignedToUserId: user.id,
      title: "Entegrasyon testlerini yap",
      description: "Yeni entegrasyon bağlantılarını test et ve sonuçları raporla.",
      status: "completed",
      priority: "high",
      dueDate: lastWeek,
      completedAt: lastWeek, // Completed on time
    },
    // Cancelled task
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[2]?.id || null,
      assignedToUserId: user.id,
      title: "İptal edilen görev örneği",
      description: "Bu görev iptal edilmiş bir örnektir.",
      status: "cancelled",
      priority: "low",
      dueDate: nextWeek,
    },
    // More pending tasks
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[0]?.id || null,
      assignedToUserId: user.id,
      title: "Vergi beyannamesi hazırlığı",
      description: "Yıllık vergi beyannamesi için gerekli belgeleri topla ve hazırla.",
      status: "pending",
      priority: "high",
      dueDate: nextWeek,
    },
    {
      tenantId: tenant.id,
      clientCompanyId: clientCompanies[1]?.id || null,
      assignedToUserId: user.id,
      title: "Müşteri risk skorunu güncelle",
      description: "Son dönem verilerine göre müşteri risk skorunu yeniden hesapla.",
      status: "in_progress",
      priority: "medium",
      dueDate: tomorrow,
    },
  ];

  console.log(`\n📝 Creating ${tasks.length} demo tasks...`);

  for (const taskData of tasks) {
    try {
      const task = await prisma.task.create({
        data: taskData,
      });

    const statusEmoji = {
      pending: "⏳",
      in_progress: "🔄",
      completed: "✅",
      cancelled: "❌",
    }[task.status] || "📌";

    const priorityEmoji = {
      low: "🟢",
      medium: "🟡",
      high: "🔴",
    }[task.priority] || "⚪";

    console.log(
      `  ${statusEmoji} ${priorityEmoji} ${task.title} (${task.status}, ${task.priority})`
    );
    } catch (error: any) {
      if (error.code === "P2002") {
        console.log(`  ⚠️  Task already exists: ${taskData.title}`);
      } else {
        console.error(`  ❌ Error creating task "${taskData.title}":`, error.message);
      }
    }
  }

  console.log(`\n✅ Successfully created ${tasks.length} demo tasks!`);
  console.log("\n📊 Task Summary:");
  
  const taskStats = await prisma.task.groupBy({
    by: ["status", "priority"],
    where: { tenantId: tenant.id },
    _count: true,
  });

  const statusCounts = await prisma.task.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
  });

  console.log("\nBy Status:");
  statusCounts.forEach((stat) => {
    console.log(`  ${stat.status}: ${stat._count}`);
  });

  console.log("\nBy Priority:");
  const priorityCounts = await prisma.task.groupBy({
    by: ["priority"],
    where: { tenantId: tenant.id },
    _count: true,
  });
  priorityCounts.forEach((stat) => {
    console.log(`  ${stat.priority}: ${stat._count}`);
  });

  const overdueCount = await prisma.task.count({
    where: {
      tenantId: tenant.id,
      status: { in: ["pending", "in_progress"] },
      dueDate: { lt: now },
    },
  });

  console.log(`\n⚠️  Overdue tasks: ${overdueCount}`);
}

seedTasks()
  .catch((e) => {
    console.error("❌ Error seeding tasks:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



