import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";
import { Decimal } from "@prisma/client/runtime/library";

interface MaliMusavirProfileInput {
  licenseType: "SMMM" | "YMM";
  licenseNumber: string;
  turmobNumber?: string;
  chamberName?: string;
  specializations?: string[];
  insuranceProvider?: string;
  insuranceAmount?: number;
  insuranceExpiry?: string;
  insurancePolicyNo?: string;
}

class MaliMusavirDashboardService {
  /**
   * Get comprehensive Mali Müşavir dashboard
   */
  async getDashboard(tenantId: string) {
    const [
      profile,
      clientCount,
      masakStats,
      kurganStats,
      babsStats,
      beyannameStats,
      upcomingDeadlines,
    ] = await Promise.all([
      this.getProfile(tenantId),
      prisma.clientCompany.count({ where: { tenantId } }),
      this.getMasakSummary(tenantId),
      this.getKurganSummary(tenantId),
      this.getBaBsSummary(tenantId),
      this.getBeyannameSummary(tenantId),
      this.getUpcomingDeadlines(tenantId),
    ]);

    return {
      profile,
      clientCount,
      masak: masakStats,
      kurgan: kurganStats,
      babs: babsStats,
      beyanname: beyannameStats,
      upcomingDeadlines,
    };
  }

  /**
   * Get or create Mali Müşavir profile
   */
  async getProfile(tenantId: string) {
    return prisma.maliMusavirProfile.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Create or update Mali Müşavir profile
   */
  async upsertProfile(tenantId: string, input: MaliMusavirProfileInput) {
    const data: any = {
      licenseType: input.licenseType,
      licenseNumber: input.licenseNumber,
      turmobNumber: input.turmobNumber,
      chamberName: input.chamberName,
      specializations: input.specializations || [],
      insuranceProvider: input.insuranceProvider,
      insuranceAmount: input.insuranceAmount != null ? new Decimal(input.insuranceAmount) : null,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
      insurancePolicyNo: input.insurancePolicyNo,
    };

    // Count active clients
    const activeClients = await prisma.clientCompany.count({ where: { tenantId } });
    data.totalActiveClients = activeClients;

    return prisma.maliMusavirProfile.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  /**
   * Update CPD (Continuing Professional Development) hours
   */
  async updateCpdHours(tenantId: string, hours: number) {
    const profile = await prisma.maliMusavirProfile.findUnique({ where: { tenantId } });
    if (!profile) throw new Error("Mali müşavir profili bulunamadı");

    return prisma.maliMusavirProfile.update({
      where: { tenantId },
      data: {
        cpdHoursCompleted: new Decimal(hours),
      },
    });
  }

  /**
   * Update MASAK training date
   */
  async updateMasakTraining(tenantId: string, trainingDate: string) {
    return prisma.maliMusavirProfile.update({
      where: { tenantId },
      data: {
        masakTrainingDate: new Date(trainingDate),
      },
    });
  }

  // Summary helpers

  private async getMasakSummary(tenantId: string) {
    const [total, pending, overdue] = await Promise.all([
      prisma.masakReport.count({ where: { tenantId } }),
      prisma.masakReport.count({ where: { tenantId, status: { in: ["draft", "pending_review"] } } }),
      prisma.masakReport.count({
        where: {
          tenantId,
          status: { in: ["draft", "pending_review"] },
          deadline: { lt: new Date() },
        },
      }),
    ]);
    return { total, pending, overdue };
  }

  private async getKurganSummary(tenantId: string) {
    const [total, newSignals, critical] = await Promise.all([
      prisma.kurganSignal.count({ where: { tenantId } }),
      prisma.kurganSignal.count({ where: { tenantId, status: "new" } }),
      prisma.kurganSignal.count({ where: { tenantId, severity: "critical" } }),
    ]);
    return { total, newSignals, critical };
  }

  private async getBaBsSummary(tenantId: string) {
    const [total, draft, mismatched] = await Promise.all([
      prisma.baBsForm.count({ where: { tenantId } }),
      prisma.baBsForm.count({ where: { tenantId, status: "draft" } }),
      prisma.baBsForm.count({ where: { tenantId, crossCheckStatus: "mismatched" } }),
    ]);
    return { total, draft, mismatched };
  }

  private async getBeyannameSummary(tenantId: string) {
    const now = new Date();
    const [total, draft, overdue] = await Promise.all([
      prisma.beyanname.count({ where: { tenantId } }),
      prisma.beyanname.count({ where: { tenantId, status: { in: ["draft", "calculated"] } } }),
      prisma.beyanname.count({
        where: {
          tenantId,
          status: { in: ["draft", "calculating", "calculated", "reviewed"] },
          dueDate: { lt: now },
        },
      }),
    ]);
    return { total, draft, overdue };
  }

  private async getUpcomingDeadlines(tenantId: string) {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const [masakDeadlines, beyannameDeadlines] = await Promise.all([
      prisma.masakReport.findMany({
        where: {
          tenantId,
          status: { in: ["draft", "pending_review"] },
          deadline: { gte: now, lte: thirtyDaysLater },
        },
        orderBy: { deadline: "asc" },
        take: 5,
        include: { clientCompany: { select: { name: true } } },
      }),
      prisma.beyanname.findMany({
        where: {
          tenantId,
          status: { in: ["draft", "calculating", "calculated", "reviewed"] },
          dueDate: { gte: now, lte: thirtyDaysLater },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { clientCompany: { select: { name: true } } },
      }),
    ]);

    const deadlines = [
      ...masakDeadlines.map((m) => ({
        type: "masak" as const,
        id: m.id,
        clientCompanyName: m.clientCompany.name,
        description: `MASAK ${m.suspicionType} raporu`,
        dueDate: m.deadline!,
      })),
      ...beyannameDeadlines.map((b) => ({
        type: "beyanname" as const,
        id: b.id,
        clientCompanyName: b.clientCompany.name,
        description: `${b.type} beyannamesi (${b.period})`,
        dueDate: b.dueDate,
      })),
    ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return deadlines.slice(0, 10);
  }
}

export const maliMusavirDashboardService = new MaliMusavirDashboardService();
