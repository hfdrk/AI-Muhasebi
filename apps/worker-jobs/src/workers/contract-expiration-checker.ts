import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";

// Use dynamic imports to load services from backend-api at runtime
// If not available (e.g., in Docker), skip this check gracefully
async function getContractAnalysisService() {
  try {
    const module = await import("../../../backend-api/src/services/contract-analysis-service.js");
    return module.contractAnalysisService;
  } catch (error1: unknown) {
    try {
      const module = await import("../../../backend-api/src/services/contract-analysis-service");
      return module.contractAnalysisService;
    } catch (error2: unknown) {
      // Service not available (e.g., in Docker container), return null to skip
      logger.warn("[ContractExpirationChecker] ContractAnalysisService not available, skipping contract checks");
      return null;
    }
  }
}

/**
 * Process contract expiration checks for all active tenants
 */
export async function processContractExpirationChecks(): Promise<void> {
  try {
    logger.info("[ContractExpirationChecker] Starting contract expiration checks");

    const contractAnalysisService = await getContractAnalysisService();
    
    // Skip if service not available
    if (!contractAnalysisService) {
      logger.info("[ContractExpirationChecker] Skipping - ContractAnalysisService not available");
      return;
    }

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
    });

    let totalChecked = 0;
    let totalExpiringSoon = 0;
    let totalExpired = 0;
    let totalAlertsCreated = 0;

    for (const tenant of tenants) {
      try {
        logger.info(`[ContractExpirationChecker] Checking contracts for tenant: ${tenant.name} (${tenant.id})`);

        const result = await contractAnalysisService.checkContractExpirations(tenant.id);

        totalChecked += result.checked;
        totalExpiringSoon += result.expiringSoon;
        totalExpired += result.expired;
        totalAlertsCreated += result.alertsCreated;

        if (result.checked > 0) {
          logger.info(
            `[ContractExpirationChecker] Tenant ${tenant.name}: checked=${result.checked}, expiringSoon=${result.expiringSoon}, expired=${result.expired}, alertsCreated=${result.alertsCreated}`
          );
        }
      } catch (error: any) {
        logger.error(
          `[ContractExpirationChecker] Error checking contracts for tenant ${tenant.id}:`,
          error
        );
        // Continue with other tenants even if one fails
      }
    }

    logger.info(
      `[ContractExpirationChecker] Completed contract expiration checks: totalChecked=${totalChecked}, totalExpiringSoon=${totalExpiringSoon}, totalExpired=${totalExpired}, totalAlertsCreated=${totalAlertsCreated}`
    );
  } catch (error: any) {
    logger.error("[ContractExpirationChecker] Error processing contract expiration checks:", error);
    throw error;
  }
}


