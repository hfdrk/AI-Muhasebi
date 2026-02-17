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
        config: updatedConfig as any,
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
   * 
   * Supported transformations:
   * - uppercase, lowercase, trim: String case/whitespace
   * - date:format:YYYY-MM-DD: Date formatting (supports various formats)
   * - number:format:0.00: Number formatting (supports decimal places)
   * - regex:pattern:replacement: Regex-based replacement
   * - replace:old:new: Simple string replacement
   */
  private applyTransformation(value: unknown, transformation: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Parse transformation with parameters (format: "type:param1:param2")
    const parts = transformation.split(":");
    const transformType = parts[0];

    switch (transformType) {
      case "uppercase":
        return typeof value === "string" ? value.toUpperCase() : value;
      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;
      case "trim":
        return typeof value === "string" ? value.trim() : value;

      case "date": {
        // Date formatting: date:format:YYYY-MM-DD
        if (typeof value !== "string" && !(value instanceof Date)) {
          return value;
        }

        const date = value instanceof Date ? value : new Date(value as string);
        if (isNaN(date.getTime())) {
          return value; // Invalid date, return original
        }

        const format = parts[1] || "YYYY-MM-DD";
        return this.formatDate(date, format);
      }

      case "number": {
        // Number formatting: number:format:0.00
        if (typeof value !== "number" && typeof value !== "string") {
          return value;
        }

        const num = typeof value === "number" ? value : parseFloat(value as string);
        if (isNaN(num)) {
          return value; // Invalid number, return original
        }

        const format = parts[1] || "0.00";
        return this.formatNumber(num, format);
      }

      case "regex": {
        // Regex replacement: regex:pattern:replacement
        if (typeof value !== "string") {
          return value;
        }

        const pattern = parts[1];
        const replacement = parts[2] || "";

        if (!pattern) {
          return value;
        }

        try {
          const regex = new RegExp(pattern, "g");
          return (value as string).replace(regex, replacement);
        } catch (error) {
          // Invalid regex, return original
          return value;
        }
      }

      case "replace": {
        // Simple string replacement: replace:old:new
        if (typeof value !== "string") {
          return value;
        }

        const oldStr = parts[1];
        const newStr = parts[2] || "";

        if (!oldStr) {
          return value;
        }

        return (value as string).replace(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), newStr);
      }

      default:
        return value;
    }
  }

  /**
   * Format date according to format string
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return format
      .replace(/YYYY/g, String(year))
      .replace(/MM/g, month)
      .replace(/DD/g, day)
      .replace(/HH/g, hours)
      .replace(/mm/g, minutes)
      .replace(/ss/g, seconds);
  }

  /**
   * Format number according to format string
   */
  private formatNumber(num: number, format: string): string | number {
    // Parse format like "0.00" or "0,00" (Turkish decimal separator)
    const decimalPlaces = (format.match(/\.(\d+)/) || [])[1];
    if (decimalPlaces) {
      const places = parseInt(decimalPlaces, 10);
      const formatted = num.toFixed(places);
      // Replace decimal separator if format uses comma
      return format.includes(",") ? formatted.replace(".", ",") : formatted;
    }

    // Integer format
    if (format.includes("0") && !format.includes(".")) {
      return Math.round(num).toString();
    }

    // Default: return number as-is
    return num;
  }
}

export const integrationMappingService = new IntegrationMappingService();



