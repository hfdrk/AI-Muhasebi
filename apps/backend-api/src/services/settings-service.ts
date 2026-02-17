import { prisma } from "../lib/prisma";
import { NotFoundError, ValidationError } from "@repo/shared-utils";
import type {
  TenantSettings,
  UpdateTenantSettingsInput,
  UserSettings,
  UpdateUserSettingsInput,
  EffectiveUserSettings,
  RiskThresholds,
} from "@repo/core-domain";

export class SettingsService {
  /**
   * Get tenant settings, creating with defaults if they don't exist
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    // Verify tenant exists first
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      // Create with defaults
      try {
        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            locale: "tr-TR",
            timezone: "Europe/Istanbul",
            riskThresholds: { high: 70, critical: 90 },
            defaultReportPeriod: "LAST_30_DAYS",
          },
        });
      } catch (error: any) {
        // If creation fails (e.g., race condition), try to fetch again
        settings = await prisma.tenantSettings.findUnique({
          where: { tenantId },
        });
        if (!settings) {
          throw error;
        }
      }
    }

    return {
      id: settings.id,
      tenantId: settings.tenantId,
      displayName: settings.displayName,
      logoUrl: settings.logoUrl,
      locale: settings.locale,
      timezone: settings.timezone,
      emailFromName: settings.emailFromName,
      riskThresholds: (settings.riskThresholds as unknown) as RiskThresholds,
      defaultReportPeriod: settings.defaultReportPeriod as TenantSettings["defaultReportPeriod"],
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    input: UpdateTenantSettingsInput
  ): Promise<TenantSettings> {
    // Ensure tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError("Kiracı bulunamadı.");
    }

    // Validate risk thresholds if provided
    if (input.riskThresholds) {
      if (
        typeof input.riskThresholds.high !== "number" ||
        typeof input.riskThresholds.critical !== "number"
      ) {
        throw new ValidationError("Risk eşikleri geçerli sayılar olmalıdır.");
      }
      if (
        input.riskThresholds.high < 0 ||
        input.riskThresholds.high > 100 ||
        input.riskThresholds.critical < 0 ||
        input.riskThresholds.critical > 100
      ) {
        throw new ValidationError("Risk eşikleri 0-100 arasında olmalıdır.");
      }
      if (input.riskThresholds.high >= input.riskThresholds.critical) {
        throw new ValidationError("Yüksek risk eşiği kritik eşikten düşük olmalıdır.");
      }
    }

    // Get or create settings
    const existing = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const updated = await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        displayName: input.displayName ?? null,
        logoUrl: input.logoUrl ?? null,
        locale: input.locale ?? "tr-TR",
        timezone: input.timezone ?? "Europe/Istanbul",
        emailFromName: input.emailFromName ?? null,
        riskThresholds: (input.riskThresholds ?? { high: 70, critical: 90 }) as any,
        defaultReportPeriod: input.defaultReportPeriod ?? "LAST_30_DAYS",
      },
      update: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.locale !== undefined && { locale: input.locale }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.emailFromName !== undefined && { emailFromName: input.emailFromName }),
        ...(input.riskThresholds !== undefined && { riskThresholds: input.riskThresholds as any }),
        ...(input.defaultReportPeriod !== undefined && {
          defaultReportPeriod: input.defaultReportPeriod,
        }),
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      displayName: updated.displayName,
      logoUrl: updated.logoUrl,
      locale: updated.locale,
      timezone: updated.timezone,
      emailFromName: updated.emailFromName,
      riskThresholds: (updated.riskThresholds as unknown) as RiskThresholds,
      defaultReportPeriod: updated.defaultReportPeriod as TenantSettings["defaultReportPeriod"],
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get user settings with effective values (merged with tenant defaults)
   */
  async getUserSettings(
    userId: string,
    tenantId: string
  ): Promise<EffectiveUserSettings> {
    // Get user settings
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!userSettings) {
      // Create with defaults
      userSettings = await prisma.userSettings.create({
        data: {
          userId,
          emailNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
        },
      });
    }

    // Get tenant settings for defaults
    const tenantSettings = await this.getTenantSettings(tenantId);

    // Calculate effective values
    const effectiveLocale = userSettings.locale ?? tenantSettings.locale;
    const effectiveTimezone = userSettings.timezone ?? tenantSettings.timezone;

    const result: UserSettings = {
      id: userSettings.id,
      userId: userSettings.userId,
      locale: userSettings.locale,
      timezone: userSettings.timezone,
      emailNotificationsEnabled: userSettings.emailNotificationsEnabled,
      inAppNotificationsEnabled: userSettings.inAppNotificationsEnabled,
      createdAt: userSettings.createdAt,
      updatedAt: userSettings.updatedAt,
    };

    return {
      userSettings: result,
      effectiveLocale,
      effectiveTimezone,
      effectiveEmailNotificationsEnabled: userSettings.emailNotificationsEnabled,
      effectiveInAppNotificationsEnabled: userSettings.inAppNotificationsEnabled,
    };
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    userId: string,
    input: UpdateUserSettingsInput
  ): Promise<UserSettings> {
    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        locale: input.locale ?? null,
        timezone: input.timezone ?? null,
        emailNotificationsEnabled: input.emailNotificationsEnabled ?? true,
        inAppNotificationsEnabled: input.inAppNotificationsEnabled ?? true,
      },
      update: {
        ...(input.locale !== undefined && { locale: input.locale }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.emailNotificationsEnabled !== undefined && {
          emailNotificationsEnabled: input.emailNotificationsEnabled,
        }),
        ...(input.inAppNotificationsEnabled !== undefined && {
          inAppNotificationsEnabled: input.inAppNotificationsEnabled,
        }),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      locale: updated.locale,
      timezone: updated.timezone,
      emailNotificationsEnabled: updated.emailNotificationsEnabled,
      inAppNotificationsEnabled: updated.inAppNotificationsEnabled,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get risk thresholds for a tenant
   */
  async getRiskThresholds(tenantId: string): Promise<RiskThresholds> {
    const settings = await this.getTenantSettings(tenantId);
    return settings.riskThresholds;
  }
}

export const settingsService = new SettingsService();


