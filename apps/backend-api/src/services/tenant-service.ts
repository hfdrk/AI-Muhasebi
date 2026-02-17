import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError, logger } from "@repo/shared-utils";
import { hashPassword } from "@repo/shared-utils";
import { auditService } from "./audit-service";
import { emailService } from "./email-service";
import { getConfig } from "@repo/config";
import { randomBytes } from "crypto";
import type { Tenant, UpdateTenantInput } from "@repo/core-domain";
import { TENANT_ROLES } from "@repo/core-domain";

export class TenantService {
  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      taxNumber: tenant.taxNumber,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      settings: tenant.settings as Record<string, unknown> | null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async updateTenant(tenantId: string, input: UpdateTenantInput, userId: string): Promise<Tenant> {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: input.name,
        taxNumber: input.taxNumber ?? undefined,
        phone: input.phone ?? undefined,
        email: input.email ?? undefined,
        address: input.address ?? undefined,
        settings: input.settings ? (input.settings as any) : undefined,
      },
    });

    await auditService.logAuthAction("TENANT_UPDATED", userId, tenantId, {
      updatedFields: Object.keys(input),
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      taxNumber: tenant.taxNumber,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      settings: tenant.settings as Record<string, unknown> | null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async listTenantUsers(tenantId: string) {
    const users = await prisma.userTenantMembership.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // For ReadOnly users, find their associated client company
    const usersWithCompanies = await Promise.all(
      users.map(async (m) => {
        let companyName: string | null = null;
        
        // If user is ReadOnly, find their associated company by email match
        if (m.role === "ReadOnly" && m.user.email) {
          const company = await prisma.clientCompany.findFirst({
            where: {
              tenantId,
              contactEmail: {
                equals: m.user.email,
                mode: "insensitive",
              },
              isActive: true,
            },
            select: {
              name: true,
            },
          });
          
          if (company) {
            companyName = company.name;
          }
        }

        return {
          id: m.user.id,
          name: m.user.fullName,
          email: m.user.email,
          role: m.role,
          status: m.status,
          createdAt: m.createdAt,
          companyName, // Add company name for customer users
        };
      })
    );

    return usersWithCompanies;
  }

  async inviteUser(
    tenantId: string,
    email: string,
    role: string,
    inviterUserId: string,
    name?: string
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user doesn't exist, create them (they'll need to set password via invitation)
    if (!user) {
      // Generate a temporary password that user must change
      const tempPassword = randomBytes(32).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          hashedPassword,
          fullName: name || normalizedEmail.split("@")[0], // Use provided name or temporary name
          locale: "tr-TR",
          isActive: true,
        },
      });
    } else if (name && user.fullName !== name) {
      // Update user's name if provided and different
      await prisma.user.update({
        where: { id: user.id },
        data: { fullName: name },
      });
    }

    // Check if membership already exists
    const existingMembership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
    });

    if (existingMembership) {
      throw new ValidationError("Bu kullanıcı zaten bu kiracıya üye.");
    }

    // Check usage limit before creating membership
    const { usageService } = await import("./usage-service");
    const limitCheck = await usageService.checkLimit(tenantId, "USERS" as any);
    if (!limitCheck.allowed) {
      throw new ValidationError(
        "Maksimum kullanıcı limitine ulaşıldı. Daha fazla kullanıcı eklemek için planınızı yükseltmeniz gerekiyor."
      );
    }

    // Create or update membership with "invited" status
    await prisma.userTenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role: role as "TenantOwner" | "Accountant" | "Staff" | "ReadOnly",
        status: "invited",
      },
    });

    // Increment usage after successful membership creation
    await usageService.incrementUsage(tenantId, "USERS" as any, 1);

    await auditService.logAuthAction("USER_INVITED", inviterUserId, tenantId, {
      invitedUserId: user.id,
      invitedEmail: normalizedEmail,
      role,
    });

    // Send invitation email with link to accept invitation
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const config = getConfig();
      const frontendUrl = config.FRONTEND_URL || config.CORS_ORIGIN || "http://localhost:3000";
      const acceptLink = `${frontendUrl}/auth/register?email=${encodeURIComponent(normalizedEmail)}&tenant=${tenantId}`;

      const roleLabel = role === TENANT_ROLES.TENANT_OWNER
        ? "Muhasebeci"
        : role === TENANT_ROLES.READ_ONLY
        ? "Müşteri"
        : role;

      await emailService.sendTemplatedEmail(
        "user-invitation",
        [normalizedEmail],
        `${tenant?.name || "AI Muhasebi"} - Davet`,
        {
          userName: name || normalizedEmail.split("@")[0],
          tenantName: tenant?.name || "AI Muhasebi",
          role: roleLabel,
          acceptLink,
          inviterName: inviterUserId, // Could fetch inviter name if needed
          year: new Date().getFullYear(),
        }
      );

      logger.info(`Invitation email sent to ${normalizedEmail} for tenant ${tenantId}`);
    } catch (error) {
      // Log error but don't fail the request
      logger.error(`Failed to send invitation email to ${normalizedEmail}:`, {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
      });
      // In development, log for testing
      if (process.env.NODE_ENV === "development") {
        logger.info(`Invitation sent to ${normalizedEmail} for tenant ${tenantId}`);
      }
    }
  }

  async acceptInvitation(
    userId: string,
    tenantId: string,
    password: string
  ): Promise<void> {
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership || membership.status !== "invited") {
      throw new NotFoundError("Davet bulunamadı veya zaten kabul edilmiş.");
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword },
      });
    }

    // Update membership status to active
    await prisma.userTenantMembership.update({
      where: { id: membership.id },
      data: { status: "active" },
    });

    await auditService.logAuthAction("USER_ACTIVATED", userId, tenantId);
  }

  async changeUserRole(
    tenantId: string,
    userId: string,
    newRole: string,
    changerUserId: string
  ): Promise<void> {
    // Role hierarchy: TenantOwner > Accountant > Staff > ReadOnly
    const ROLE_HIERARCHY: Record<string, number> = {
      TenantOwner: 4,
      Accountant: 3,
      Staff: 2,
      ReadOnly: 1,
    };

    // Prevent self-role-change
    if (userId === changerUserId) {
      throw new ValidationError("Kendi rolünüzü değiştiremezsiniz.");
    }

    // Look up the changer's role
    const changerMembership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: changerUserId,
          tenantId,
        },
      },
    });

    if (!changerMembership) {
      throw new NotFoundError("Yetki bilgisi bulunamadı.");
    }

    const changerLevel = ROLE_HIERARCHY[changerMembership.role] || 0;
    const targetLevel = ROLE_HIERARCHY[newRole] || 0;

    // Only TenantOwner can assign TenantOwner role
    if (newRole === "TenantOwner" && changerMembership.role !== "TenantOwner") {
      throw new ValidationError("Sadece ofis sahibi TenantOwner rolü atayabilir.");
    }

    // Changer cannot assign a role equal or higher than their own (except TenantOwner)
    if (targetLevel >= changerLevel && changerMembership.role !== "TenantOwner") {
      throw new ValidationError("Kendi rolünüzden üst veya eşit bir rol atayamazsınız.");
    }

    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Kullanıcı üyeliği bulunamadı.");
    }

    // Changer cannot modify someone with equal or higher role (unless TenantOwner)
    const existingLevel = ROLE_HIERARCHY[membership.role] || 0;
    if (existingLevel >= changerLevel && changerMembership.role !== "TenantOwner") {
      throw new ValidationError("Kendi rolünüzden üst veya eşit role sahip kullanıcıları değiştiremezsiniz.");
    }

    await prisma.userTenantMembership.update({
      where: { id: membership.id },
      data: { role: newRole as "TenantOwner" | "Accountant" | "Staff" | "ReadOnly" },
    });

    await auditService.logAuthAction("ROLE_CHANGED", changerUserId, tenantId, {
      targetUserId: userId,
      oldRole: membership.role,
      newRole,
    });
  }

  async updateUserStatus(
    tenantId: string,
    userId: string,
    status: "active" | "suspended",
    changerUserId: string
  ): Promise<void> {
    const membership = await prisma.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Kullanıcı üyeliği bulunamadı.");
    }

    await prisma.userTenantMembership.update({
      where: { id: membership.id },
      data: { status },
    });

    await auditService.logAuthAction("USER_STATUS_CHANGED", changerUserId, tenantId, {
      targetUserId: userId,
      oldStatus: membership.status,
      newStatus: status,
    });
  }
}

export const tenantService = new TenantService();

