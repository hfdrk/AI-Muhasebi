import { Router, type Router as ExpressRouter } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import { taskService } from "../services/task-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

const createTaskSchema = z.object({
  clientCompanyId: z.string().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  title: z.string().min(1, "Başlık gerekli."),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial();

// List tasks
router.get(
  "/",
  requirePermission("tasks:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        clientCompanyId: req.query.clientCompanyId as string | undefined,
        assignedToUserId: req.query.assignedToUserId as string | undefined,
        status: req.query.status as "pending" | "in_progress" | "completed" | "cancelled" | undefined,
        priority: req.query.priority as "low" | "medium" | "high" | undefined,
        overdue: req.query.overdue === "true",
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = await taskService.listTasks(req.context!.tenantId!, filters);

      // Return the result directly (it already has the correct structure with data, total, page, etc.)
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get task by ID
router.get(
  "/:id",
  requirePermission("tasks:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const task = await taskService.getTaskById(req.context!.tenantId!, req.params.id);

      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

// Create task
router.post(
  "/",
  requirePermission("tasks:create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = createTaskSchema.parse(req.body);
      const task = await taskService.createTask(req.context!.tenantId!, {
        tenantId: req.context!.tenantId!,
        clientCompanyId: body.clientCompanyId,
        assignedToUserId: body.assignedToUserId,
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      });

      res.status(201).json({ data: task });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Update task
router.patch(
  "/:id",
  requirePermission("tasks:update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(req.context!.tenantId!, req.params.id, {
        clientCompanyId: body.clientCompanyId,
        assignedToUserId: body.assignedToUserId,
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });

      res.json({ data: task });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: error.issues[0]?.message || "Geçersiz bilgiler.",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  }
);

// Delete task
router.delete(
  "/:id",
  requirePermission("tasks:delete"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await taskService.deleteTask(req.context!.tenantId!, req.params.id);

      res.json({ data: { message: "Görev silindi." } });
    } catch (error) {
      next(error);
    }
  }
);

// Get task statistics
router.get(
  "/stats/summary",
  requirePermission("tasks:read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await taskService.getTaskStatistics(req.context!.tenantId!);

      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
