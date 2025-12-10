import { prisma } from "../lib/prisma";
import { hasPermission } from "@repo/core-domain";
import type { RequestContext } from "../types/request-context";

export interface GlobalSearchOptions {
  limitPerGroup?: number;
}

export interface GlobalSearchResult {
  clients: Array<{
    id: string;
    name: string;
    taxNumber: string;
  }>;
  invoices: Array<{
    id: string;
    externalId: string | null;
    counterpartyName: string | null;
    clientCompanyId: string;
  }>;
  documents: Array<{
    id: string;
    originalFileName: string;
    clientCompanyId: string;
  }>;
  riskAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    clientCompanyId: string | null;
  }>;
  reports: Array<{
    id: string;
    reportCode: string;
    startedAt: Date;
  }>;
}

export class GlobalSearchService {
  async search(
    tenantId: string,
    userContext: RequestContext,
    query: string,
    options: GlobalSearchOptions = {}
  ): Promise<GlobalSearchResult> {
    const limitPerGroup = options.limitPerGroup || 5;

    // Return empty results if query is too short
    if (!query || query.trim().length < 2) {
      return {
        clients: [],
        invoices: [],
        documents: [],
        riskAlerts: [],
        reports: [],
      };
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;

    const results: GlobalSearchResult = {
      clients: [],
      invoices: [],
      documents: [],
      riskAlerts: [],
      reports: [],
    };

    // Search clients (if user has clients:read permission)
    if (userContext.membership && hasPermission(userContext.membership.role, "clients:read")) {
      const clients = await prisma.clientCompany.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { taxNumber: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: limitPerGroup,
        select: {
          id: true,
          name: true,
          taxNumber: true,
        },
        orderBy: { createdAt: "desc" },
      });
      results.clients = clients;
    }

    // Search invoices (if user has invoices:read permission)
    if (userContext.membership && hasPermission(userContext.membership.role, "invoices:read")) {
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { externalId: { contains: searchTerm, mode: "insensitive" } },
            { counterpartyName: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: limitPerGroup,
        select: {
          id: true,
          externalId: true,
          counterpartyName: true,
          clientCompanyId: true,
        },
        orderBy: { createdAt: "desc" },
      });
      results.invoices = invoices;
    }

    // Search documents (if user has documents:read permission)
    if (userContext.membership && hasPermission(userContext.membership.role, "documents:read")) {
      const documents = await prisma.document.findMany({
        where: {
          tenantId,
          isDeleted: false,
          originalFileName: { contains: searchTerm, mode: "insensitive" },
        },
        take: limitPerGroup,
        select: {
          id: true,
          originalFileName: true,
          clientCompanyId: true,
        },
        orderBy: { createdAt: "desc" },
      });
      results.documents = documents;
    }

    // Search risk alerts (if user has risk:view permission)
    if (userContext.membership && hasPermission(userContext.membership.role, "risk:view")) {
      const riskAlerts = await prisma.riskAlert.findMany({
        where: {
          tenantId,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { message: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: limitPerGroup,
        select: {
          id: true,
          title: true,
          severity: true,
          clientCompanyId: true,
        },
        orderBy: { createdAt: "desc" },
      });
      results.riskAlerts = riskAlerts;
    }

    // Search reports (if user has reports:view permission)
    if (userContext.membership && hasPermission(userContext.membership.role, "reports:view")) {
      const reports = await prisma.reportExecutionLog.findMany({
        where: {
          tenantId,
          reportCode: { contains: searchTerm, mode: "insensitive" },
        },
        take: limitPerGroup,
        select: {
          id: true,
          reportCode: true,
          startedAt: true,
        },
        orderBy: { startedAt: "desc" },
      });
      results.reports = reports;
    }

    return results;
  }
}

export const globalSearchService = new GlobalSearchService();


