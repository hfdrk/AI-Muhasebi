import { Router } from "express";
import adminTenantsRoutes from "./admin-tenants-routes";
import adminUsersRoutes from "./admin-users-routes";
import adminSupportRoutes from "./admin-support-routes";
import adminImpersonationRoutes from "./admin-impersonation-routes";
import adminMetricsRoutes from "./admin-metrics-routes";

const router = Router();

// Mount admin sub-routes
router.use("/tenants", adminTenantsRoutes);
router.use("/users", adminUsersRoutes);
router.use("/support", adminSupportRoutes);
router.use("/impersonation", adminImpersonationRoutes);
router.use("/metrics", adminMetricsRoutes);

export default router;



