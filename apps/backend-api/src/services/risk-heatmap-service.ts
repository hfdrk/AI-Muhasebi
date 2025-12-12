import { prisma } from "../lib/prisma";

export interface RiskHeatMapClient {
  id: string;
  name: string;
  riskScore: number;
  severity: "low" | "medium" | "high";
  alertCount: number;
  documentCount: number;
}

export interface RiskHeatMap {
  clients: RiskHeatMapClient[];
  riskMatrix: {
    low: { low: number; medium: number; high: number };
    medium: { low: number; medium: number; high: number };
    high: { low: number; medium: number; high: number };
  };
  totalClients: number;
  averageRiskScore: number;
}

export class RiskHeatMapService {
  /**
   * Get risk heat map data for dashboard
   */
  async getRiskHeatMap(tenantId: string): Promise<RiskHeatMap> {
    // Get all client companies with their risk scores
    const companyScores = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    // Get distinct companies (latest score per company)
    const companyMap = new Map<string, typeof companyScores[0]>();
    companyScores.forEach((score) => {
      const companyId = score.clientCompanyId;
      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, score);
      }
    });

    // Get alert counts per company
    const alerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        clientCompanyId: {
          in: Array.from(companyMap.keys()),
        },
        status: {
          in: ["open", "in_progress"],
        },
      },
      select: {
        clientCompanyId: true,
      },
    });

    const alertCounts = new Map<string, number>();
    alerts.forEach((alert) => {
      if (alert.clientCompanyId) {
        alertCounts.set(alert.clientCompanyId, (alertCounts.get(alert.clientCompanyId) || 0) + 1);
      }
    });

    // Get document counts per company
    const documents = await prisma.document.findMany({
      where: {
        tenantId,
        isDeleted: false,
        clientCompanyId: {
          in: Array.from(companyMap.keys()),
        },
      },
      select: {
        clientCompanyId: true,
      },
    });

    const documentCounts = new Map<string, number>();
    documents.forEach((doc) => {
      if (doc.clientCompanyId) {
        documentCounts.set(doc.clientCompanyId, (documentCounts.get(doc.clientCompanyId) || 0) + 1);
      }
    });

    // Build client list
    const clients: RiskHeatMapClient[] = Array.from(companyMap.values()).map((score) => ({
      id: score.clientCompany.id,
      name: score.clientCompany.name,
      riskScore: Number(score.score),
      severity: score.severity as "low" | "medium" | "high",
      alertCount: alertCounts.get(score.clientCompanyId) || 0,
      documentCount: documentCounts.get(score.clientCompanyId) || 0,
    }));

    // Calculate risk matrix (severity distribution)
    const riskMatrix = {
      low: { low: 0, medium: 0, high: 0 },
      medium: { low: 0, medium: 0, high: 0 },
      high: { low: 0, medium: 0, high: 0 },
    };

    // For now, we'll use a simplified matrix based on risk score ranges
    // This can be enhanced with impact vs likelihood analysis
    clients.forEach((client) => {
      const score = client.riskScore;
      const alertCount = client.alertCount;

      // Determine impact (based on alert count)
      const impact = alertCount >= 5 ? "high" : alertCount >= 2 ? "medium" : "low";
      // Determine likelihood (based on risk score)
      const likelihood = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

      if (likelihood === "low") {
        if (impact === "low") riskMatrix.low.low += 1;
        else if (impact === "medium") riskMatrix.low.medium += 1;
        else riskMatrix.low.high += 1;
      } else if (likelihood === "medium") {
        if (impact === "low") riskMatrix.medium.low += 1;
        else if (impact === "medium") riskMatrix.medium.medium += 1;
        else riskMatrix.medium.high += 1;
      } else {
        if (impact === "low") riskMatrix.high.low += 1;
        else if (impact === "medium") riskMatrix.high.medium += 1;
        else riskMatrix.high.high += 1;
      }
    });

    // Calculate average risk score
    const averageRiskScore =
      clients.length > 0 ? clients.reduce((sum, c) => sum + c.riskScore, 0) / clients.length : 0;

    return {
      clients: clients.sort((a, b) => b.riskScore - a.riskScore), // Sort by risk score descending
      riskMatrix,
      totalClients: clients.length,
      averageRiskScore,
    };
  }
}

export const riskHeatMapService = new RiskHeatMapService();

