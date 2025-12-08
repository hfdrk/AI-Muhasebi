import type { Request, Response, NextFunction } from "express";
import { logger, type LogContext } from "@repo/shared-utils";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// Routes that should skip body logging (sensitive data)
const SENSITIVE_ROUTES = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
];

// Routes that should be skipped entirely (health checks, etc.)
const SKIP_ROUTES = ["/health", "/ready"];

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip logging for certain routes
  if (SKIP_ROUTES.includes(req.path)) {
    return next();
  }

  // Generate request ID if not present
  if (!req.requestId) {
    req.requestId = uuidv4();
  }

  // Record start time
  req.startTime = Date.now();

  // Capture response finish to log duration
  res.on("finish", () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    // Build context from request
    const context: LogContext = {
      requestId: req.requestId,
    };

    // Add tenant ID if available (from tenant middleware)
    if ((req as any).tenantId) {
      context.tenantId = (req as any).tenantId;
    }

    // Add user ID if available (from auth middleware)
    if ((req as any).userId) {
      context.userId = (req as any).userId;
    }

    // Determine log level based on status code
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    // Build metadata
    const metadata: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Add query params if present (but not for sensitive routes)
    if (Object.keys(req.query).length > 0 && !SENSITIVE_ROUTES.includes(req.path)) {
      metadata.query = req.query;
    }

    // Log the request
    logger.logWithMetadata(level, `${req.method} ${req.path}`, {
      ...metadata,
      ...context,
    });
  });

  next();
}


