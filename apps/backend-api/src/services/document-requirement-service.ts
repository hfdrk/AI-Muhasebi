import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  DocumentRequirement,
  CreateDocumentRequirementInput,
  UpdateDocumentRequirementInput,
  DocumentRequirementStatus,
} from "@repo/core-domain";
import type { PaginatedResult } from "./client-company-service";
import { notificationService } from "./notification-service";

export interface ListDocumentRequirementsFilters {
  clientCompanyId?: string;
  documentType?: string;
  status?: DocumentRequirementStatus;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export class DocumentRequirementService {
  async listRequirements(
    tenantId: string,
    filters: ListDocumentRequirementsFilters = {}
  ): Promise<PaginatedResult<DocumentRequirement>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.overdue) {
      const now = new Date();
      where.requiredByDate = {
        lt: now,
      };
      where.status = {
        not: "received",
      };
    }

    const [data, total] = await Promise.all([
      prisma.documentRequirement.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          receivedDocument: {
            select: {
              id: true,
              originalFileName: true,
            },
          },
        },
        orderBy: [
          { requiredByDate: "asc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.documentRequirement.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clientCompanyId: item.clientCompanyId,
        documentType: item.documentType,
        requiredByDate: item.requiredByDate,
        status: item.status as DocumentRequirementStatus,
        receivedDocumentId: item.receivedDocumentId,
        description: item.description,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getRequirementById(tenantId: string, id: string): Promise<DocumentRequirement> {
    const requirement = await prisma.documentRequirement.findFirst({
      where: { id, tenantId },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        receivedDocument: {
          select: {
            id: true,
            originalFileName: true,
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundError("Belge gereksinimi bulunamadı.");
    }

    return {
      id: requirement.id,
      tenantId: requirement.tenantId,
      clientCompanyId: requirement.clientCompanyId,
      documentType: requirement.documentType,
      requiredByDate: requirement.requiredByDate,
      status: requirement.status as DocumentRequirementStatus,
      receivedDocumentId: requirement.receivedDocumentId,
      description: requirement.description,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    };
  }

  async createRequirement(
    tenantId: string,
    input: CreateDocumentRequirementInput
  ): Promise<DocumentRequirement> {
    // Verify client company belongs to tenant
    const client = await prisma.clientCompany.findFirst({
      where: { id: input.clientCompanyId, tenantId },
    });

    if (!client) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    const requirement = await prisma.documentRequirement.create({
      data: {
        tenantId,
        clientCompanyId: input.clientCompanyId,
        documentType: input.documentType,
        requiredByDate: input.requiredByDate,
        description: input.description ?? null,
        status: "pending",
      },
    });

    // Check if already overdue
    if (requirement.requiredByDate < new Date()) {
      await prisma.documentRequirement.update({
        where: { id: requirement.id },
        data: { status: "overdue" },
      });
      requirement.status = "overdue";

      // Create notification
      await notificationService.createNotification({
        tenantId,
        userId: null,
        type: "SYSTEM",
        title: "Eksik Belge Uyarısı",
        message: `${client.name} için ${input.documentType} belgesi vadesi geçmiş durumda.`,
        meta: {
          documentRequirementId: requirement.id,
          clientCompanyId: input.clientCompanyId,
        },
      });
    }

    return {
      id: requirement.id,
      tenantId: requirement.tenantId,
      clientCompanyId: requirement.clientCompanyId,
      documentType: requirement.documentType,
      requiredByDate: requirement.requiredByDate,
      status: requirement.status as DocumentRequirementStatus,
      receivedDocumentId: requirement.receivedDocumentId,
      description: requirement.description,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    };
  }

  async updateRequirement(
    tenantId: string,
    id: string,
    input: UpdateDocumentRequirementInput
  ): Promise<DocumentRequirement> {
    const existing = await prisma.documentRequirement.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError("Belge gereksinimi bulunamadı.");
    }

    // If marking as received, verify document exists and belongs to tenant
    if (input.status === "received" && input.receivedDocumentId) {
      const document = await prisma.document.findFirst({
        where: {
          id: input.receivedDocumentId,
          tenantId,
          clientCompanyId: existing.clientCompanyId,
        },
      });

      if (!document) {
        throw new NotFoundError("Belge bulunamadı veya bu müşteriye ait değil.");
      }
    }

    const updateData: any = { ...input };

    // Auto-update status based on date
    if (input.requiredByDate) {
      const now = new Date();
      if (input.requiredByDate < now && input.status !== "received") {
        updateData.status = "overdue";
      }
    }

    const requirement = await prisma.documentRequirement.update({
      where: { id },
      data: updateData,
    });

    return {
      id: requirement.id,
      tenantId: requirement.tenantId,
      clientCompanyId: requirement.clientCompanyId,
      documentType: requirement.documentType,
      requiredByDate: requirement.requiredByDate,
      status: requirement.status as DocumentRequirementStatus,
      receivedDocumentId: requirement.receivedDocumentId,
      description: requirement.description,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    };
  }

  async deleteRequirement(tenantId: string, id: string): Promise<void> {
    const requirement = await prisma.documentRequirement.findFirst({
      where: { id, tenantId },
    });

    if (!requirement) {
      throw new NotFoundError("Belge gereksinimi bulunamadı.");
    }

    await prisma.documentRequirement.delete({
      where: { id },
    });
  }

  /**
   * Check for missing documents and update statuses
   * Should be called periodically (e.g., daily cron job)
   */
  async checkAndUpdateMissingDocuments(tenantId: string): Promise<{
    checked: number;
    markedOverdue: number;
    alertsCreated: number;
  }> {
    const now = new Date();

    // Find all pending requirements that are now overdue
    const overdueRequirements = await prisma.documentRequirement.findMany({
      where: {
        tenantId,
        status: "pending",
        requiredByDate: {
          lt: now,
        },
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    let alertsCreated = 0;

    for (const requirement of overdueRequirements) {
      // Update status to overdue
      await prisma.documentRequirement.update({
        where: { id: requirement.id },
        data: { status: "overdue" },
      });

      // Create notification
      try {
        await notificationService.createNotification({
          tenantId,
          userId: null,
          type: "SYSTEM",
          title: "Eksik Belge Uyarısı",
          message: `${requirement.clientCompany.name} için ${requirement.documentType} belgesi vadesi geçti.`,
          meta: {
            documentRequirementId: requirement.id,
            clientCompanyId: requirement.clientCompanyId,
          },
        });
        alertsCreated++;
      } catch (error) {
        console.error("[DocumentRequirementService] Error creating notification:", error);
      }
    }

    return {
      checked: overdueRequirements.length,
      markedOverdue: overdueRequirements.length,
      alertsCreated,
    };
  }

  /**
   * Check if uploaded document fulfills any requirements
   * Called from document service when a document is uploaded
   */
  async checkDocumentFulfillsRequirements(
    tenantId: string,
    clientCompanyId: string,
    documentType: string,
    documentId: string
  ): Promise<void> {
    // Find pending or overdue requirements for this client and document type
    const requirements = await prisma.documentRequirement.findMany({
      where: {
        tenantId,
        clientCompanyId,
        documentType,
        status: {
          in: ["pending", "overdue"],
        },
        receivedDocumentId: null,
      },
      orderBy: {
        requiredByDate: "asc",
      },
      take: 1, // Fulfill the earliest requirement
    });

    if (requirements.length > 0) {
      const requirement = requirements[0];
      await prisma.documentRequirement.update({
        where: { id: requirement.id },
        data: {
          status: "received",
          receivedDocumentId: documentId,
        },
      });
    }
  }
}

export const documentRequirementService = new DocumentRequirementService();
