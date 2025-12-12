import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string; // Optional transformation rule
}

export interface IntegrationMappingConfig {
  invoiceMappings?: FieldMapping[];
  transactionMappings?: FieldMapping[];
  clientCompanyMappings?: FieldMapping[];
}

export class IntegrationMappingService {
  /**
   * Get field mappings for an integration
   */
  async getMappings(tenantId: string, integrationId: string): Promise<IntegrationMappingConfig> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    const config = integration.config as Record<string, unknown>;
    return (config.fieldMappings as IntegrationMappingConfig) || {};
  }

  /**
   * Update field mappings for an integration
   */
  async updateMappings(
    tenantId: string,
    integrationId: string,
    mappings: IntegrationMappingConfig
  ): Promise<IntegrationMappingConfig> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    const config = integration.config as Record<string, unknown>;
    const updatedConfig = {
      ...config,
      fieldMappings: mappings,
    };

    await prisma.tenantIntegration.update({
      where: { id: integrationId },
      data: {
        config: updatedConfig,
      },
    });

    return mappings;
  }

  /**
   * Get suggested field mappings based on provider and existing data
   */
  async getSuggestedMappings(
    tenantId: string,
    integrationId: string
  ): Promise<IntegrationMappingConfig> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: integrationId, tenantId },
      include: {
        provider: true,
      },
    });

    if (!integration) {
      throw new NotFoundError("Entegrasyon bulunamadı.");
    }

    // Default mappings based on provider type
    const suggestions: IntegrationMappingConfig = {
      invoiceMappings: [
        { sourceField: "invoiceNumber", targetField: "invoiceNumber" },
        { sourceField: "issueDate", targetField: "issueDate" },
        { sourceField: "dueDate", targetField: "dueDate" },
        { sourceField: "totalAmount", targetField: "totalAmount" },
        { sourceField: "taxAmount", targetField: "taxAmount" },
        { sourceField: "netAmount", targetField: "netAmount" },
        { sourceField: "counterpartyName", targetField: "counterpartyName" },
        { sourceField: "counterpartyTaxNumber", targetField: "counterpartyTaxNumber" },
      ],
      transactionMappings: [
        { sourceField: "bookingDate", targetField: "bookingDate" },
        { sourceField: "valueDate", targetField: "valueDate" },
        { sourceField: "description", targetField: "description" },
        { sourceField: "amount", targetField: "amount" },
        { sourceField: "currency", targetField: "currency" },
      ],
      clientCompanyMappings: [
        { sourceField: "name", targetField: "name" },
        { sourceField: "taxNumber", targetField: "taxNumber" },
        { sourceField: "address", targetField: "address" },
      ],
    };

    // Provider-specific suggestions
    if (integration.provider.code === "MIKRO_ACCOUNTING") {
      // Mikro-specific field name mappings
      suggestions.invoiceMappings?.push(
        { sourceField: "invoiceNumber", targetField: "faturaNo" },
        { sourceField: "issueDate", targetField: "tarih" }
      );
    } else if (integration.provider.code === "LOGO_ACCOUNTING") {
      // Logo-specific field name mappings
      suggestions.invoiceMappings?.push(
        { sourceField: "invoiceNumber", targetField: "belgeNo" },
        { sourceField: "issueDate", targetField: "tarih" }
      );
    }

    return suggestions;
  }

  /**
   * Apply field mappings to transform data
   */
  applyMappings<T extends Record<string, unknown>>(
    data: T,
    mappings: FieldMapping[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const sourceValue = data[mapping.sourceField];
      if (sourceValue !== undefined) {
        let transformedValue = sourceValue;

        // Apply transformation if specified
        if (mapping.transformation) {
          transformedValue = this.applyTransformation(sourceValue, mapping.transformation);
        }

        result[mapping.targetField] = transformedValue;
      }
    }

    return result;
  }

  /**
   * Apply transformation rule to a value
   */
  private applyTransformation(value: unknown, transformation: string): unknown {
    // Simple transformation examples
    // TODO: Implement more complex transformations
    switch (transformation) {
      case "uppercase":
        return typeof value === "string" ? value.toUpperCase() : value;
      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;
      case "trim":
        return typeof value === "string" ? value.trim() : value;
      default:
        return value;
    }
  }
}

export const integrationMappingService = new IntegrationMappingService();


