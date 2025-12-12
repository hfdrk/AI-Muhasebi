import { prisma } from "../lib/prisma";
import { TENANT_ROLES } from "@repo/core-domain";
import type { RequestContext } from "../types/request-context";

/**
 * Get the customer company ID for a ReadOnly user
 * Matches user email with client company contact email
 */
export async function getCustomerCompanyId(
  context: RequestContext
): Promise<string | null> {
  // Only apply to ReadOnly users
  if (context.membership?.role !== TENANT_ROLES.READ_ONLY) {
    return null;
  }

  if (!context.user?.email || !context.tenantId) {
    return null;
  }

  // Find client company by matching user email with contact email
  const clientCompany = await prisma.clientCompany.findFirst({
    where: {
      tenantId: context.tenantId,
      contactEmail: {
        equals: context.user.email,
        mode: "insensitive",
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return clientCompany?.id || null;
}

/**
 * Enforce customer data isolation for ReadOnly users
 * Automatically filters by customer company ID if user is ReadOnly
 */
export async function enforceCustomerIsolation(
  context: RequestContext,
  filters: { clientCompanyId?: string | null }
): Promise<{ clientCompanyId: string | null }> {
  const customerCompanyId = await getCustomerCompanyId(context);

  // If user is ReadOnly and we found their company, force filter by it
  if (customerCompanyId) {
    return { clientCompanyId: customerCompanyId };
  }

  // For non-ReadOnly users, use the provided filter
  return { clientCompanyId: filters.clientCompanyId || null };
}


