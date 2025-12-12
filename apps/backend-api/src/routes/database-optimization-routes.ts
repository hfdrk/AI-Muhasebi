import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { databaseOptimizationService } from "../services/database-optimization-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Get index recommendations
router.get(
  "/indexes/recommendations",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const recommendations = databaseOptimizationService.getIndexRecommendations();
      res.json({ data: recommendations });
    } catch (error) {
      next(error);
    }
  }
);

// Create recommended indexes
router.post(
  "/indexes/create",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await databaseOptimizationService.createRecommendedIndexes();
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get connection pool stats
router.get(
  "/connection-pool/stats",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await databaseOptimizationService.getConnectionPoolStats();
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Analyze table sizes
router.get(
  "/tables/sizes",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sizes = await databaseOptimizationService.analyzeTableSizes();
      res.json({ data: sizes });
    } catch (error) {
      next(error);
    }
  }
);

// Vacuum tables
router.post(
  "/tables/vacuum",
  requirePermission("admin"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tableNames = req.body.tableNames as string[] | undefined;
      const result = await databaseOptimizationService.vacuumTables(tableNames);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

