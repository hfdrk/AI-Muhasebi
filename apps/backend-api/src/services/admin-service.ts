import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type { Tenant, User } from "@repo/core-domain";

export interface TenantsOverviewParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface TenantOverviewItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  status: string;
  billingPlan: string | null;
  userCount: number;
  clientCompanyCount: number;
  documentCount: number;
  invoiceCount: number;
}

export interface TenantDetail extends Tenant {
  billingPlan: string | null;
  quotaUsage: {
    clientCompanies: number;
    documents: number;
    users: number;
    scheduledReports: number;
  };
  recentRiskAlertsCount: number;
  recentFailedIntegrationsCount: number;
  tenantSettings: any;
  recentAuditEvents: any[];
}

export interface UsersOverviewParams {
  page?: number;
  pageSize?: number;
  email?: string;
  tenantId?: string;
  role?: string;
}

export interface UserOverviewItem {
  id: string;
  name: string;
  email: string;
  platformRoles: string[];
  tenantMemberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    status: string;
  }>;
  lastLoginAt: Date | null;
}

export interface SupportIncidentParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  type?: string;
  status?: string;
}

export interface SupportIncident {
  id: string;
  type: "SCHEDULED_REPORT" | "INTEGRATION_SYNC" | "OTHER";
  tenantId: string;
  tenantName: string;
  message: string;
  createdAt: Date;
  status: string;
  resourceId: string | null;
}

export class AdminService {
  async getTenantsOverview(params: TenantsOverviewParams = {}) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { slug: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: true,
          memberships: true,
          clientCompanies: true,
          documents: true,
          invoices: true,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    const items: TenantOverviewItem[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
      status: tenant.status || "ACTIVE",
      billingPlan: tenant.subscription?.plan || null,
      userCount: tenant.memberships.length,
      clientCompanyCount: tenant.clientCompanies.length,
      documentCount: tenant.documents.length,
      invoiceCount: tenant.invoices.length,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getTenantDetail(tenantId: string): Promise<TenantDetail> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        tenantSettings: true,
        memberships: true,
        clientCompanies: true,
        documents: true,
        invoices: true,
        riskAlerts: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        integrationSyncJobs: {
          where: {
            status: "failed",
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    // Get quota usage from TenantUsage
    const usages = await prisma.tenantUsage.findMany({
      where: {
        tenantId,
        periodStart: {
          lte: new Date(),
        },
        periodEnd: {
          gte: new Date(),
        },
      },
    });

    const quotaUsage = {
      clientCompanies: usages.find((u) => u.metric === "CLIENT_COMPANIES")?.value || 0,
      documents: usages.find((u) => u.metric === "DOCUMENTS")?.value || 0,
      users: usages.find((u) => u.metric === "USERS")?.value || 0,
      scheduledReports: usages.find((u) => u.metric === "SCHEDULED_REPORTS")?.value || 0,
    };

    return {
      ...tenant,
      billingPlan: tenant.subscription?.plan || null,
      quotaUsage,
      recentRiskAlertsCount: tenant.riskAlerts.length,
      recentFailedIntegrationsCount: tenant.integrationSyncJobs.length,
      tenantSettings: tenant.tenantSettings,
      recentAuditEvents: tenant.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        user: log.user,
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
    };
  }

  async updateTenantStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    return prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });
  }

  async getUsersOverview(params: UsersOverviewParams = {}) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.email) {
      where.email = { contains: params.email, mode: "insensitive" };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          memberships: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Filter by tenantId or role if provided
    let filteredUsers = users;
    if (params.tenantId || params.role) {
      filteredUsers = users.filter((user) => {
        if (params.tenantId && !user.memberships.some((m) => m.tenantId === params.tenantId)) {
          return false;
        }
        if (params.role) {
          const hasRole =
            user.platformRole === params.role ||
            user.memberships.some((m) => m.role === params.role);
          if (!hasRole) return false;
        }
        return true;
      });
    }

    const items: UserOverviewItem[] = filteredUsers.map((user) => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
      platformRoles: user.platformRole ? [user.platformRole] : [],
      tenantMemberships: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        role: m.role,
        status: m.status,
      })),
      lastLoginAt: user.lastLoginAt,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / pageSize),
      },
    };
  }

  async getSupportIncidents(params: SupportIncidentParams = {}) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get failed report executions
    const reportExecutionsWhere: any = {
      status: "failed",
      startedAt: { gte: sevenDaysAgo },
    };
    if (params.tenantId) {
      reportExecutionsWhere.tenantId = params.tenantId;
    }

    const [failedReports, failedIntegrations] = await Promise.all([
      prisma.reportExecutionLog.findMany({
        where: reportExecutionsWhere,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      }),
      prisma.integrationSyncJob.findMany({
        where: {
          status: "failed",
          createdAt: { gte: sevenDaysAgo },
          ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const incidents: SupportIncident[] = [
      ...failedReports.map((log) => ({
        id: log.id,
        type: "SCHEDULED_REPORT" as const,
        tenantId: log.tenantId,
        tenantName: log.tenant.name,
        message: log.message || "Rapor çalıştırma hatası",
        createdAt: log.startedAt,
        status: log.status,
        resourceId: log.scheduledReportId || null,
      })),
      ...failedIntegrations.map((job) => ({
        id: job.id,
        type: "INTEGRATION_SYNC" as const,
        tenantId: job.tenantId,
        tenantName: job.tenant.name,
        message: job.errorMessage || "Entegrasyon senkronizasyon hatası",
        createdAt: job.createdAt,
        status: job.status,
        resourceId: job.tenantIntegrationId,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply type filter if provided
    const filteredIncidents = params.type
      ? incidents.filter((i) => i.type === params.type)
      : incidents;

    // Paginate
    const paginatedIncidents = filteredIncidents.slice(skip, skip + pageSize);

    return {
      items: paginatedIncidents,
      pagination: {
        page,
        pageSize,
        total: filteredIncidents.length,
        totalPages: Math.ceil(filteredIncidents.length / pageSize),
      },
    };
  }

  async getPlatformMetrics() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalClientCompanies,
      totalDocuments,
      totalInvoices,
      riskAlertsLast7Days,
      failedIntegrationsLast7Days,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count(),
      prisma.clientCompany.count(),
      prisma.document.count(),
      prisma.invoice.count(),
      prisma.riskAlert.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.integrationSyncJob.count({
        where: {
          status: "failed",
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      suspended_tenants: suspendedTenants,
      total_users: totalUsers,
      total_client_companies: totalClientCompanies,
      total_documents: totalDocuments,
      total_invoices: totalInvoices,
      total_risk_alerts_last_7_days: riskAlertsLast7Days,
      total_failed_integrations_last_7_days: failedIntegrationsLast7Days,
    };
  }
}

export const adminService = new AdminService();


