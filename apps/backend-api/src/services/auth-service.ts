import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, validatePassword } from "@repo/shared-utils";
import { generateAccessToken, generateRefreshToken } from "@repo/shared-utils";
import { randomBytes } from "crypto";
import { AuthenticationError, ValidationError } from "@repo/shared-utils";
import { auditService } from "./audit-service";
import type { User, Tenant, CreateUserInput, CreateTenantInput } from "@repo/core-domain";
import { TENANT_ROLES } from "@repo/core-domain";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  tenantId?: string;
}

export interface RegisterInput {
  user: {
    email: string;
    password: string;
    fullName: string;
  };
  tenant: {
    name: string;
    slug: string;
    taxNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

export interface RegisterResult {
  user: User;
  tenant: Tenant;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login(input: LoginInput, ipAddress?: string): Promise<LoginResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { status: "active" },
          include: { tenant: true },
        },
      },
    });

    if (!user || !user.isActive) {
      await auditService.logAuthAction("LOGIN_FAILED", null, null, {
        email: normalizedEmail,
        ipAddress,
      });
      throw new AuthenticationError("E-posta veya şifre hatalı.");
    }

    // Check account lockout status
    const { securityService } = await import("./security-service");
    const lockoutStatus = await securityService.getAccountLockoutStatus(user.id);
    if (lockoutStatus.locked) {
      await auditService.logAuthAction("LOGIN_BLOCKED", user.id, null, {
        email: normalizedEmail,
        ipAddress,
        reason: "account_locked",
        lockoutUntil: lockoutStatus.lockoutUntil,
      });
      throw new AuthenticationError(
        `Hesap geçici olarak kilitlendi. ${lockoutStatus.lockoutUntil ? `Kilit ${new Date(lockoutStatus.lockoutUntil).toLocaleString("tr-TR")} tarihine kadar sürecek.` : ""}`
      );
    }

    // Check IP whitelist if enabled
    const firstMembership = user.memberships[0];
    const tenantId = firstMembership?.tenantId;
    if (tenantId && ipAddress) {
      const isWhitelisted = await securityService.isIPWhitelisted(tenantId, ipAddress, user.id);
      // Note: IP whitelisting is optional - can be enforced if needed
      // if (!isWhitelisted) {
      //   throw new AuthenticationError("IP adresi izin listesinde değil.");
      // }
    }

    const isValidPassword = await verifyPassword(input.password, user.hashedPassword);
    if (!isValidPassword) {
      // Record failed attempt
      await securityService.recordFailedAttempt(user.id);
      await auditService.logAuthAction("LOGIN_FAILED", user.id, null, {
        email: normalizedEmail,
        ipAddress,
      });
      throw new AuthenticationError("E-posta veya şifre hatalı.");
    }

    // Clear failed attempts on successful login
    await securityService.clearFailedAttempts(user.id);

    // Update last login (gracefully handle if user was deleted)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error: any) {
      // P2025: Record not found - user was deleted between find and update
      // This can happen in test scenarios during database cleanup, but shouldn't block login
      // Check for P2025 error code (PrismaClientKnownRequestError)
      if (error?.code === "P2025") {
        // Silently continue - user was found and password verified, so login should succeed
        // The lastLoginAt update is non-critical
      } else {
        // Re-throw any other errors
        throw error;
      }
    }

    // Generate tokens
    const platformRoles = user.platformRole ? [user.platformRole] : [];
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId,
      roles: firstMembership ? [firstMembership.role] : [],
      platformRoles,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      tenantId,
    });

    await auditService.logAuthAction("LOGIN_SUCCESS", user.id, tenantId ?? null, {
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        hashedPassword: user.hashedPassword,
        fullName: user.fullName,
        locale: user.locale,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      refreshToken,
      tenantId: tenantId ?? undefined,
    };
  }

  async register(input: RegisterInput, ipAddress?: string): Promise<RegisterResult> {
    // Validate password
    const passwordValidation = validatePassword(input.user.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(" "));
    }

    // Check if email already exists
    const normalizedEmail = input.user.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ValidationError("Bu e-posta adresi zaten kullanılıyor.");
    }

    // Check if tenant slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: input.tenant.slug },
    });

    if (existingTenant) {
      throw new ValidationError("Bu ofis adı zaten kullanılıyor.");
    }

    // Hash password
    const hashedPassword = await hashPassword(input.user.password);

    // Create user, tenant, and membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          hashedPassword,
          fullName: input.user.fullName,
          locale: "tr-TR",
          isActive: true,
        },
      });

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenant.name,
          slug: input.tenant.slug,
          taxNumber: input.tenant.taxNumber ?? null,
          phone: input.tenant.phone ?? null,
          email: input.tenant.email ?? null,
          address: input.tenant.address ?? null,
          settings: {},
        },
      });

      // Create membership as TenantOwner
      await tx.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: TENANT_ROLES.TENANT_OWNER,
          status: "active",
        },
      });

      return { user, tenant };
    });

    // Audit logs
    await auditService.logAuthAction("USER_CREATED", result.user.id, result.tenant.id, {
      email: normalizedEmail,
      ipAddress,
    });
    await auditService.logAuthAction("TENANT_CREATED", result.user.id, result.tenant.id, {
      tenantName: result.tenant.name,
      ipAddress,
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      roles: [TENANT_ROLES.TENANT_OWNER],
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        hashedPassword: result.user.hashedPassword,
        fullName: result.user.fullName,
        locale: result.user.locale,
        isActive: result.user.isActive,
        lastLoginAt: result.user.lastLoginAt,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        taxNumber: result.tenant.taxNumber,
        phone: result.tenant.phone,
        email: result.tenant.email,
        address: result.tenant.address,
        settings: result.tenant.settings as Record<string, unknown> | null,
        createdAt: result.tenant.createdAt,
        updatedAt: result.tenant.updatedAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return;
    }

    // Generate secure random token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store or update reset token
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token,
        expiresAt,
      },
      update: {
        token,
        expiresAt,
      },
    });

    await auditService.logAuthAction("PASSWORD_RESET_REQUESTED", user.id, null, {
      email: normalizedEmail,
      ipAddress,
    });

    // TODO: Send email with reset link
    // Email should contain: ${FRONTEND_URL}/auth/reset-password?token=${token}
    console.log(`Password reset token for ${normalizedEmail}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(" "));
    }

    // Find token (we'll need to verify JWT and find by user)
    // For now, we'll store the token in the database and verify it
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      throw new AuthenticationError("Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.");
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and delete reset token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { hashedPassword },
      });

      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
    });

    await auditService.logAuthAction("PASSWORD_RESET_COMPLETED", resetToken.userId, null, {
      ipAddress,
    });
  }

  async logout(userId: string, tenantId: string | null, ipAddress?: string): Promise<void> {
    await auditService.logAuthAction("LOGOUT", userId, tenantId, {
      ipAddress,
    });
    // Token invalidation would be handled by a token blacklist (Redis) in production
    // For now, we just log the logout
  }
}

export const authService = new AuthService();

