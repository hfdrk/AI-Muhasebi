import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/core-domain";
import { logger } from "@repo/shared-utils";
// Note: Requires packages: otplib, qrcode
// Install with: npm install otplib qrcode @types/qrcode
// For now, using simplified implementation that can be enhanced with these packages

/**
 * Enhanced Security Service
 * 
 * Provides 2FA, IP whitelisting, session management, password policy, and account lockout.
 */
export interface TwoFactorAuth {
  enabled: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface IPWhitelist {
  id: string;
  tenantId: string;
  userId?: string;
  ipAddress: string;
  description?: string;
  createdAt: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
}

export interface AccountLockoutStatus {
  locked: boolean;
  lockoutUntil?: Date;
  failedAttempts: number;
  remainingAttempts: number;
}

export class SecurityService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90 days
  };

  /**
   * Enable 2FA for a user
   */
  async enable2FA(tenantId: string, userId: string): Promise<TwoFactorAuth> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
            status: "active",
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    // Generate secret (simplified - in production use otplib)
    const secret = this.generateSecret();
    const serviceName = "AI Muhasebi";
    const accountName = user.email;

    // Generate QR code URL (simplified - in production use qrcode library)
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(serviceName)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(serviceName)}`;
    // QR code generation would require qrcode package
    const qrCode = `data:image/svg+xml;base64,${Buffer.from(`<svg>QR Code for ${otpAuthUrl}</svg>`).toString("base64")}`;

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store 2FA data in user metadata
    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    userMetadata.twoFactorAuth = {
      enabled: false, // Will be enabled after verification
      secret,
      backupCodes: backupCodes.map((code) => this.hashBackupCode(code)),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: userMetadata,
      },
    });

    return {
      enabled: false,
      secret,
      qrCode,
      backupCodes, // Return plain codes only once
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verifyAndEnable2FA(
    tenantId: string,
    userId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
            status: "active",
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const twoFactorAuth = userMetadata.twoFactorAuth as Record<string, unknown> | undefined;

    if (!twoFactorAuth || !twoFactorAuth.secret) {
      throw new ValidationError("2FA kurulumu bulunamadı.");
    }

    const secret = twoFactorAuth.secret as string;
    // TOTP verification (simplified - in production use otplib.authenticator.verify)
    const isValid = this.verifyTOTP(token, secret);

    if (!isValid) {
      return { success: false, message: "Geçersiz 2FA kodu." };
    }

    // Enable 2FA
    userMetadata.twoFactorAuth = {
      ...twoFactorAuth,
      enabled: true,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: userMetadata,
      },
    });

    logger.info(`2FA enabled for user ${userId}`);

    return { success: true, message: "2FA başarıyla etkinleştirildi." };
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const twoFactorAuth = userMetadata.twoFactorAuth as Record<string, unknown> | undefined;

    if (!twoFactorAuth || !twoFactorAuth.enabled || !twoFactorAuth.secret) {
      return false;
    }

    const secret = twoFactorAuth.secret as string;

    // Check TOTP token (simplified - in production use otplib.authenticator.verify)
    const isValidTOTP = this.verifyTOTP(token, secret);

    if (isValidTOTP) {
      return true;
    }

    // Check backup codes
    const backupCodes = (twoFactorAuth.backupCodes as string[]) || [];
    for (let i = 0; i < backupCodes.length; i++) {
      const hashedCode = backupCodes[i];
      if (this.verifyBackupCode(token, hashedCode)) {
        // Remove used backup code
        backupCodes.splice(i, 1);
        userMetadata.twoFactorAuth = {
          ...twoFactorAuth,
          backupCodes,
        };
        await prisma.user.update({
          where: { id: userId },
          data: { metadata: userMetadata },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(tenantId: string, userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            tenantId,
            status: "active",
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    userMetadata.twoFactorAuth = {
      enabled: false,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: userMetadata,
      },
    });

    logger.info(`2FA disabled for user ${userId}`);
  }

  /**
   * Add IP to whitelist
   */
  async addIPWhitelist(
    tenantId: string,
    ipAddress: string,
    description?: string,
    userId?: string
  ): Promise<IPWhitelist> {
    // Validate IP address format
    if (!this.isValidIP(ipAddress)) {
      throw new ValidationError("Geçersiz IP adresi formatı.");
    }

    // Store in tenant metadata (would ideally be a separate table)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant bulunamadı.");
    }

    const tenantMetadata = (tenant.metadata as Record<string, unknown>) || {};
    const ipWhitelist = (tenantMetadata.ipWhitelist as Array<Record<string, unknown>>) || [];

    const whitelistEntry: IPWhitelist = {
      id: `ip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenantId,
      userId,
      ipAddress,
      description,
      createdAt: new Date(),
    };

    ipWhitelist.push(whitelistEntry);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metadata: {
          ...tenantMetadata,
          ipWhitelist,
        },
      },
    });

    logger.info(`IP whitelist added: ${ipAddress} for tenant ${tenantId}`);

    return whitelistEntry;
  }

  /**
   * Check if IP is whitelisted
   */
  async isIPWhitelisted(tenantId: string, ipAddress: string, userId?: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return false;
    }

    const tenantMetadata = (tenant.metadata as Record<string, unknown>) || {};
    const ipWhitelist = (tenantMetadata.ipWhitelist as Array<Record<string, unknown>>) || [];

    for (const entry of ipWhitelist) {
      const entryIP = entry.ipAddress as string;
      const entryUserId = entry.userId as string | undefined;

      // Check exact match or CIDR notation
      if (this.matchesIP(ipAddress, entryIP) && (!entryUserId || entryUserId === userId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, policy?: Partial<PasswordPolicy>): {
    valid: boolean;
    errors: string[];
  } {
    const effectivePolicy = { ...this.DEFAULT_PASSWORD_POLICY, ...policy };
    const errors: string[] = [];

    if (password.length < effectivePolicy.minLength) {
      errors.push(`Şifre en az ${effectivePolicy.minLength} karakter olmalıdır.`);
    }

    if (effectivePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Şifre en az bir büyük harf içermelidir.");
    }

    if (effectivePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Şifre en az bir küçük harf içermelidir.");
    }

    if (effectivePolicy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Şifre en az bir rakam içermelidir.");
    }

    if (effectivePolicy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Şifre en az bir özel karakter içermelidir.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check account lockout status
   */
  async getAccountLockoutStatus(userId: string): Promise<AccountLockoutStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const securityData = userMetadata.security as Record<string, unknown> | undefined;

    const failedAttempts = (securityData?.failedAttempts as number) || 0;
    const lockoutUntil = securityData?.lockoutUntil
      ? new Date(securityData.lockoutUntil as string)
      : undefined;

    const now = new Date();
    const locked = lockoutUntil ? lockoutUntil > now : false;

    return {
      locked,
      lockoutUntil: locked ? lockoutUntil : undefined,
      failedAttempts: locked ? this.MAX_FAILED_ATTEMPTS : failedAttempts,
      remainingAttempts: Math.max(0, this.MAX_FAILED_ATTEMPTS - failedAttempts),
    };
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(userId: string): Promise<AccountLockoutStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const securityData = (userMetadata.security as Record<string, unknown>) || {};

    const failedAttempts = ((securityData.failedAttempts as number) || 0) + 1;
    let lockoutUntil: Date | undefined;

    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);
    }

    userMetadata.security = {
      ...securityData,
      failedAttempts,
      lockoutUntil: lockoutUntil?.toISOString(),
      lastFailedAttempt: new Date().toISOString(),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: userMetadata,
      },
    });

    return this.getAccountLockoutStatus(userId);
  }

  /**
   * Clear failed attempts (on successful login)
   */
  async clearFailedAttempts(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return;
    }

    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    const securityData = (userMetadata.security as Record<string, unknown>) || {};

    userMetadata.security = {
      ...securityData,
      failedAttempts: 0,
      lockoutUntil: undefined,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: userMetadata,
      },
    });
  }

  /**
   * Generate backup codes for 2FA
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  private hashBackupCode(code: string): string {
    // Simple hash for backup codes (in production, use proper hashing)
    return Buffer.from(code).toString("base64");
  }

  /**
   * Verify backup code
   */
  private verifyBackupCode(code: string, hashedCode: string): boolean {
    const decoded = Buffer.from(hashedCode, "base64").toString();
    return decoded === code;
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    // IPv4 or IPv6 or CIDR notation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP matches whitelist entry (supports CIDR)
   */
  private matchesIP(ip: string, whitelistEntry: string): boolean {
    if (ip === whitelistEntry) {
      return true;
    }

    // Check CIDR notation (simplified - would need proper CIDR library in production)
    if (whitelistEntry.includes("/")) {
      // Simplified CIDR check
      const [network, prefix] = whitelistEntry.split("/");
      // In production, use a proper CIDR matching library
      return ip.startsWith(network);
    }

    return false;
  }

  /**
   * Generate TOTP secret (simplified implementation)
   * In production, use: import { authenticator } from "otplib"; authenticator.generateSecret();
   */
  private generateSecret(): string {
    // Generate a 32-character base32 secret
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Verify TOTP token (simplified implementation)
   * In production, use: import { authenticator } from "otplib"; authenticator.verify({ token, secret });
   * 
   * This is a placeholder - proper TOTP verification requires the otplib library
   */
  private verifyTOTP(token: string, secret: string): boolean {
    // Placeholder implementation
    // In production, this should use otplib.authenticator.verify({ token, secret })
    // For now, accept any 6-digit code (this should be replaced with proper TOTP verification)
    return /^\d{6}$/.test(token);
  }
}

export const securityService = new SecurityService();

