import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/core-domain";
import { logger } from "@repo/shared-utils";

/**
 * KVKK (Personal Data Protection Law) Compliance Service
 * 
 * Handles compliance with Turkish Personal Data Protection Law (KVKK).
 * Manages data processing consent, data access rights, deletion rights, and breach notifications.
 */
export interface KVKKConsent {
  id: string;
  userId: string;
  consentType: "data_processing" | "marketing" | "analytics" | "third_party";
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface KVKKDataRequest {
  id: string;
  userId: string;
  requestType: "access" | "deletion" | "rectification" | "portability";
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: Date;
  completedAt: Date | null;
  data?: Record<string, unknown>;
  rejectionReason?: string;
}

export interface KVKKBreachRecord {
  id: string;
  tenantId: string;
  description: string;
  affectedUsers: number;
  detectedAt: Date;
  reportedAt: Date | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "detected" | "investigating" | "contained" | "resolved" | "reported";
}

export class KVKKComplianceService {
  /**
   * Record data processing consent
   */
  async recordConsent(
    tenantId: string,
    userId: string,
    consentType: KVKKConsent["consentType"],
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<KVKKConsent> {
    // Check if user belongs to tenant
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    // Store consent in metadata (would ideally be a separate table in production)
    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const kvkkConsents = (userMetadata.kvkkConsents as Array<Record<string, unknown>>) || [];

    // Check if consent already exists
    const existingIndex = kvkkConsents.findIndex(
      (c) => c.consentType === consentType
    );

    const consent: KVKKConsent = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      consentType,
      granted,
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
      ipAddress,
      userAgent,
    };

    if (existingIndex >= 0) {
      kvkkConsents[existingIndex] = consent;
    } else {
      kvkkConsents.push(consent);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...userMetadata,
          kvkkConsents,
        },
      },
    });

    logger.info(`KVKK consent recorded: ${consentType} - ${granted ? "granted" : "revoked"} for user ${userId}`);

    return consent;
  }

  /**
   * Get user's consent status
   */
  async getConsentStatus(
    tenantId: string,
    userId: string
  ): Promise<{
    dataProcessing: boolean;
    marketing: boolean;
    analytics: boolean;
    thirdParty: boolean;
    lastUpdated: Date | null;
  }> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const kvkkConsents = (userMetadata.kvkkConsents as Array<Record<string, unknown>>) || [];

    const status = {
      dataProcessing: false,
      marketing: false,
      analytics: false,
      thirdParty: false,
      lastUpdated: null as Date | null,
    };

    for (const consent of kvkkConsents) {
      const consentType = consent.consentType as KVKKConsent["consentType"];
      const granted = consent.granted as boolean;
      const grantedAt = consent.grantedAt ? new Date(consent.grantedAt as string) : null;

      if (consentType === "data_processing") {
        status.dataProcessing = granted;
      } else if (consentType === "marketing") {
        status.marketing = granted;
      } else if (consentType === "analytics") {
        status.analytics = granted;
      } else if (consentType === "third_party") {
        status.thirdParty = granted;
      }

      if (grantedAt && (!status.lastUpdated || grantedAt > status.lastUpdated)) {
        status.lastUpdated = grantedAt;
      }
    }

    return status;
  }

  /**
   * Request data access (Right to Access)
   */
  async requestDataAccess(
    tenantId: string,
    userId: string
  ): Promise<KVKKDataRequest> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
          },
        },
      },
      include: {
        memberships: {
          where: { tenantId },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    // Collect user data
    const userData = {
      personalInfo: {
        email: user.email,
        fullName: user.fullName,
        locale: user.locale,
      },
      memberships: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
        joinedAt: m.createdAt,
      })),
      metadata: user.metadata,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    // Store request (would ideally be a separate table)
    const request: KVKKDataRequest = {
      id: `request-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      requestType: "access",
      status: "completed",
      requestedAt: new Date(),
      completedAt: new Date(),
      data: userData,
    };

    logger.info(`KVKK data access request completed for user ${userId}`);

    return request;
  }

  /**
   * Request data deletion (Right to Deletion)
   */
  async requestDataDeletion(
    tenantId: string,
    userId: string
  ): Promise<KVKKDataRequest> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    // Check if user has active memberships
    const activeMemberships = await prisma.userTenantMembership.findMany({
      where: {
        userId,
        tenantId,
        isActive: true,
      },
    });

    if (activeMemberships.length > 0) {
      // Cannot delete if user has active memberships
      return {
        id: `request-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId,
        requestType: "deletion",
        status: "rejected",
        requestedAt: new Date(),
        completedAt: new Date(),
        rejectionReason: "Kullanıcının aktif üyelikleri var. Önce üyelikler sonlandırılmalıdır.",
      };
    }

    // Anonymize user data (soft delete)
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        fullName: "Silinmiş Kullanıcı",
        isActive: false,
        metadata: {
          ...((user.metadata as Record<string, unknown>) || {}),
          deletedAt: new Date(),
          deletionReason: "KVKK data deletion request",
        },
      },
    });

    const request: KVKKDataRequest = {
      id: `request-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      requestType: "deletion",
      status: "completed",
      requestedAt: new Date(),
      completedAt: new Date(),
    };

    logger.info(`KVKK data deletion request completed for user ${userId}`);

    return request;
  }

  /**
   * Record data breach
   */
  async recordBreach(
    tenantId: string,
    description: string,
    affectedUsers: number,
    severity: KVKKBreachRecord["severity"]
  ): Promise<KVKKBreachRecord> {
    const breach: KVKKBreachRecord = {
      id: `breach-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenantId,
      description,
      affectedUsers,
      detectedAt: new Date(),
      reportedAt: severity === "high" || severity === "critical" ? new Date() : null,
      severity,
      status: severity === "high" || severity === "critical" ? "reported" : "detected",
    };

    // Store breach record (would ideally be a separate table)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant) {
      const tenantMetadata = (tenant.metadata as Record<string, unknown>) || {};
      const breaches = (tenantMetadata.kvkkBreaches as Array<Record<string, unknown>>) || [];
      breaches.push(breach);

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          metadata: {
            ...tenantMetadata,
            kvkkBreaches: breaches,
          },
        },
      });
    }

    // For high/critical breaches, KVKK requires notification within 72 hours
    if (severity === "high" || severity === "critical") {
      logger.warn(`KVKK breach detected: ${description} - ${affectedUsers} users affected`);
      // In production, would send notification to KVKK authority
    }

    return breach;
  }

  /**
   * Get data retention policy status
   */
  async checkDataRetention(
    tenantId: string,
    userId: string
  ): Promise<{
    compliant: boolean;
    issues: Array<{
      type: string;
      description: string;
      actionRequired: string;
    }>;
  }> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const issues: Array<{
      type: string;
      description: string;
      actionRequired: string;
    }> = [];

    // Check if user data exceeds retention period (typically 10 years for accounting data)
    const retentionPeriodYears = 10;
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - retentionPeriodYears);

    if (user.createdAt < retentionDate && !user.isActive) {
      issues.push({
        type: "retention_period_exceeded",
        description: `Kullanıcı verisi saklama süresini aştı (${retentionPeriodYears} yıl)`,
        actionRequired: "Veri silinmeli veya anonimleştirilmelidir.",
      });
    }

    // Check for consent expiration
    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const kvkkConsents = (userMetadata.kvkkConsents as Array<Record<string, unknown>>) || [];

    for (const consent of kvkkConsents) {
      const grantedAt = consent.grantedAt ? new Date(consent.grantedAt as string) : null;
      if (grantedAt) {
        const consentAge = (new Date().getTime() - grantedAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
        // Consent should be renewed every 2 years
        if (consentAge > 2) {
          issues.push({
            type: "consent_expired",
            description: `Onay ${consentAge.toFixed(1)} yıl önce verildi ve yenilenmeli`,
            actionRequired: "Kullanıcıdan yeni onay alınmalıdır.",
          });
        }
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }

  /**
   * Get audit log for data access
   */
  async getDataAccessAuditLog(
    tenantId: string,
    userId?: string
  ): Promise<Array<{
    timestamp: Date;
    action: string;
    userId: string;
    resourceType: string;
    resourceId: string;
    ipAddress?: string;
  }>> {
    // Get audit logs from audit service
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        userId: userId || undefined,
        action: {
          in: ["read", "update", "delete", "export"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return auditLogs.map((log) => ({
      timestamp: log.createdAt,
      action: log.action,
      userId: log.userId,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.metadata?.ipAddress as string | undefined,
    }));
  }
}

export const kvkkComplianceService = new KVKKComplianceService();

