import type { Request, Response, NextFunction } from "express";
import { cacheService } from "../services/cache-service";
import type { AuthenticatedRequest } from "../types/request-context";

/**
 * Cache middleware for GET requests
 * 
 * Caches responses for GET requests with configurable TTL
 * Cache key includes: method, path, query params, tenant ID, user ID
 */
export function cacheMiddleware(ttlMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip caching for certain paths (e.g., SSE, streaming)
    if (req.path.includes("/events/stream") || req.path.includes("/download")) {
      return next();
    }

    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.context?.tenantId || "none";
    const userId = authReq.context?.user?.id || "none";

    // Create cache key from request
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const cacheKey = `cache:${req.method}:${req.path}:${queryString}:${tenantId}:${userId}`;

    // Check cache
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (body: any) {
      // Cache successful responses (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, body, ttlMs);
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache for a specific pattern
 */
export function invalidateCache(pattern: string): void {
  // Simple implementation - in production, use a more sophisticated pattern matching
  // For now, we'll just clear all cache if pattern matches
  if (pattern === "*") {
    cacheService.clear();
  }
}

/**
 * Invalidate cache for tenant-specific data
 */
export function invalidateTenantCache(tenantId: string): void {
  // Clear all cache entries for this tenant
  // In a more sophisticated implementation, we'd iterate and delete matching keys
  // For now, we'll use a simple approach
  cacheService.clear();
}
