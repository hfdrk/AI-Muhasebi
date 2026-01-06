import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "@repo/shared-utils";

/**
 * Health check endpoint
 * Returns basic status and database connectivity
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  let dbStatus: "ok" | "error" = "ok";
  
  try {
    // Test database connection with a simple query and timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timeout")), 5000)
    );
    
    const dbPromise = prisma.$queryRaw`SELECT 1 as health_check`;
    
    await Promise.race([dbPromise, timeoutPromise]);
  } catch (error: any) {
    dbStatus = "error";
    logger.error("Health check: Database connection failed", undefined, {
      error: error.message,
    });
  }

  const status = dbStatus === "ok" ? 200 : 503;
  res.status(status).json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness check endpoint
 * Returns 200 only when database is reachable
 * Used by orchestration systems (Kubernetes, Docker, etc.)
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  try {
    // Test database connection with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timeout")), 5000)
    );
    
    const dbPromise = prisma.$queryRaw`SELECT 1 as ready_check`;
    
    await Promise.race([dbPromise, timeoutPromise]);
    
    // Database is reachable
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Database is not reachable
    logger.error("Readiness check: Database not available", undefined, {
      error: error.message,
    });
    res.status(503).json({
      status: "not ready",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Health check endpoint (lightweight)
 * Returns 200 if HTTP server is up
 * No database check - very lightweight for load balancers
 */
export async function healthzCheck(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    service: "backend-api",
  });
}

/**
 * Readiness check endpoint (with 'z' suffix)
 * Checks database connectivity and critical services
 * Returns 200 when ready, 503 when not ready
 */
export async function readyzCheck(req: Request, res: Response): Promise<void> {
  try {
    // Test database connection with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timeout")), 5000)
    );
    
    const dbPromise = prisma.$queryRaw`SELECT 1 as ready_check`;
    
    await Promise.race([dbPromise, timeoutPromise]);
    
    // Database is reachable
    res.status(200).json({
      status: "ready",
    });
  } catch (error: any) {
    // Database is not reachable
    logger.error("Readiness check (readyz): Database not available", undefined, {
      error: error.message,
    });
    res.status(503).json({
      status: "not_ready",
      details: {
        error: error.message || "Database connection failed",
      },
    });
  }
}


