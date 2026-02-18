import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";

// Whitelist of allowed table and column names to prevent SQL injection
const ALLOWED_TABLES = new Set([
  "invoices", "transactions", "documents", "risk_alerts",
  "client_companies", "users", "tenants", "user_tenant_memberships",
  "transaction_lines", "ledger_accounts", "notifications",
  "audit_logs", "integration_configs", "tasks", "contracts",
]);

const ALLOWED_COLUMNS = new Set([
  "id", "tenant_id", "client_company_id", "date", "issue_date", "type",
  "status", "created_at", "updated_at", "severity", "external_id",
  "name", "email", "counterparty_tax_number", "user_id",
]);

const ALLOWED_INDEX_TYPES = new Set(["btree", "gin", "gist", "hash"]);

function isValidIdentifier(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(name);
}

function validateTableName(table: string): void {
  if (!ALLOWED_TABLES.has(table) || !isValidIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}

function validateColumnNames(columns: string[]): void {
  for (const col of columns) {
    if (!ALLOWED_COLUMNS.has(col) || !isValidIdentifier(col)) {
      throw new Error(`Invalid column name: ${col}`);
    }
  }
}

/**
 * Database Optimization Service
 * 
 * Provides database optimization utilities:
 * - Query performance analysis
 * - Index recommendations
 * - Connection pool management
 * - Query caching strategies
 */
export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexUsed?: string;
  recommendations: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: "btree" | "gin" | "gist" | "hash";
  reason: string;
  estimatedImpact: "low" | "medium" | "high";
}

export class DatabaseOptimizationService {
  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance(
    query: string,
    params?: unknown[]
  ): Promise<QueryPerformanceMetrics> {
    const startTime = Date.now();

    try {
      // Execute query with EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN ANALYZE ${query}`;
      const result = await prisma.$queryRawUnsafe(explainQuery, ...(params || []));

      const executionTime = Date.now() - startTime;
      const recommendations: string[] = [];

      // Parse EXPLAIN output (simplified)
      const explainText = JSON.stringify(result);
      
      // Check for sequential scans
      if (explainText.includes("Seq Scan")) {
        recommendations.push("Sıralı tarama tespit edildi - index eklenmesi önerilir");
      }

      // Check for missing indexes
      if (explainText.includes("Filter:")) {
        recommendations.push("Filtreleme işlemi tespit edildi - uygun index kontrol edilmeli");
      }

      // Check execution time
      if (executionTime > 1000) {
        recommendations.push("Sorgu yavaş (>1s) - optimizasyon gerekli");
      }

      return {
        query,
        executionTime,
        rowsReturned: Array.isArray(result) ? result.length : 0,
        recommendations,
      };
    } catch (error) {
      logger.error("Query performance analysis error:", error);
      return {
        query,
        executionTime: Date.now() - startTime,
        rowsReturned: 0,
        recommendations: ["Sorgu analizi başarısız"],
      };
    }
  }

  /**
   * Get index recommendations for common queries
   */
  getIndexRecommendations(): IndexRecommendation[] {
    return [
      {
        table: "invoices",
        columns: ["tenant_id", "issue_date", "type"],
        type: "btree",
        reason: "Fatura listeleme sorguları için composite index",
        estimatedImpact: "high",
      },
      {
        table: "transactions",
        columns: ["tenant_id", "client_company_id", "date"],
        type: "btree",
        reason: "İşlem sorguları için composite index",
        estimatedImpact: "high",
      },
      {
        table: "documents",
        columns: ["tenant_id", "client_company_id", "type", "status"],
        type: "btree",
        reason: "Belge filtreleme sorguları için composite index",
        estimatedImpact: "medium",
      },
      {
        table: "risk_alerts",
        columns: ["tenant_id", "severity", "status", "created_at"],
        type: "btree",
        reason: "Risk uyarıları dashboard sorguları için",
        estimatedImpact: "high",
      },
      {
        table: "invoices",
        columns: ["external_id"],
        type: "btree",
        reason: "External ID lookup için",
        estimatedImpact: "medium",
      },
      {
        table: "transactions",
        columns: ["external_id"],
        type: "btree",
        reason: "External ID lookup için",
        estimatedImpact: "medium",
      },
      {
        table: "client_companies",
        columns: ["tenant_id", "name"],
        type: "btree",
        reason: "Müşteri arama sorguları için",
        estimatedImpact: "medium",
      },
      {
        table: "invoices",
        columns: ["counterparty_tax_number"],
        type: "btree",
        reason: "Taraflı fatura sorguları için",
        estimatedImpact: "low",
      },
    ];
  }

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes(): Promise<{
    created: number;
    skipped: number;
    errors: Array<{ index: string; error: string }>;
  }> {
    const recommendations = this.getIndexRecommendations();
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ index: string; error: string }>,
    };

    for (const rec of recommendations) {
      try {
        // Validate all identifiers against whitelist to prevent SQL injection
        validateTableName(rec.table);
        validateColumnNames(rec.columns);
        if (!ALLOWED_INDEX_TYPES.has(rec.type)) {
          throw new Error(`Invalid index type: ${rec.type}`);
        }

        const indexName = `idx_${rec.table}_${rec.columns.join("_")}`;
        if (!isValidIdentifier(indexName)) {
          throw new Error(`Invalid index name generated: ${indexName}`);
        }

        const columns = rec.columns.join(", ");

        // Check if index exists (parameterized query)
        const exists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = ${indexName}
          ) as exists;
        `;
        const indexExists = exists[0]?.exists;

        if (indexExists) {
          results.skipped++;
          continue;
        }

        // Create index — identifiers are whitelisted above, safe to interpolate
        const createIndexQuery = `CREATE INDEX ${indexName} ON ${rec.table} (${columns}) USING ${rec.type};`;
        await prisma.$executeRawUnsafe(createIndexQuery);
        results.created++;
        logger.info(`Index created: ${indexName}`);
      } catch (error: any) {
        results.errors.push({
          index: `${rec.table}(${rec.columns.join(", ")})`,
          error: error.message || "Unknown error",
        });
        logger.error(`Failed to create index for ${rec.table}:`, error);
      }
    }

    return results;
  }

  /**
   * Get database connection pool stats
   */
  async getConnectionPoolStats(): Promise<{
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    maxConnections: number;
  }> {
    try {
      const stats = await prisma.$queryRaw<Array<{
        active: bigint;
        idle: bigint;
        total: bigint;
        max: bigint;
      }>>`
        SELECT 
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) as total,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;

      const stat = stats[0];
      return {
        activeConnections: Number(stat.active),
        idleConnections: Number(stat.idle),
        totalConnections: Number(stat.total),
        maxConnections: Number(stat.max),
      };
    } catch (error) {
      logger.error("Failed to get connection pool stats:", error);
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        maxConnections: 100,
      };
    }
  }

  /**
   * Analyze table sizes and bloat
   */
  async analyzeTableSizes(): Promise<Array<{
    table: string;
    size: string;
    rows: number;
    indexSize: string;
    bloat?: string;
  }>> {
    try {
      const sizes = await prisma.$queryRaw<Array<{
        table: string;
        size: string;
        rows: bigint;
        index_size: string;
      }>>`
        SELECT 
          schemaname || '.' || tablename as table,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_live_tup as rows,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20;
      `;

      return sizes.map((s) => ({
        table: s.table,
        size: s.size,
        rows: Number(s.rows),
        indexSize: s.index_size,
      }));
    } catch (error) {
      logger.error("Failed to analyze table sizes:", error);
      return [];
    }
  }

  /**
   * Vacuum and analyze tables for optimization
   */
  async vacuumTables(tableNames?: string[]): Promise<{
    vacuumed: string[];
    errors: Array<{ table: string; error: string }>;
  }> {
    const results = {
      vacuumed: [] as string[],
      errors: [] as Array<{ table: string; error: string }>,
    };

    try {
      if (tableNames && tableNames.length > 0) {
        // Vacuum specific tables — validate names against whitelist
        for (const table of tableNames) {
          try {
            validateTableName(table);
            await prisma.$executeRawUnsafe(`VACUUM ANALYZE ${table};`);
            results.vacuumed.push(table);
          } catch (error: any) {
            results.errors.push({
              table,
              error: error.message || "Unknown error",
            });
          }
        }
      } else {
        // Vacuum all tables
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE;`);
        results.vacuumed.push("all_tables");
      }
    } catch (error: any) {
      logger.error("Vacuum error:", error);
      results.errors.push({
        table: "all",
        error: error.message || "Unknown error",
      });
    }

    return results;
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();

