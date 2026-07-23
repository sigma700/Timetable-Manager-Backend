import {Router} from "express";
import {verifyToken} from "../../middleware/checkToken.js";
import {requireAdmin, requireSchoolAdmin} from "../../middleware/checkRole.js";

import {
  getPlatformOverviewHandler,
  getPlatformSchoolsHandler,
  getPlatformSchoolDetailHandler,
  getPlatformUsersHandler,
  getPlatformActivityHandler,
  getPlatformHealthHandler,
} from "../controllers/superAdminController.js";

import {
  getSchoolOverviewHandler,
  getSchoolUsersHandler,
  getSchoolTeachersHandler,
  getSchoolActivityHandler,
  getSchoolHealthHandler,
} from "../controllers/schoolAdminController.js";

const adminRouter = Router();

// ─────────────────────────────────────────────
// SUPER ADMIN — platform-wide routes
// Access: admin only
// ─────────────────────────────────────────────
adminRouter.get(
  "/admin/platform/overview",
  verifyToken,
  requireAdmin,
  getPlatformOverviewHandler,
);
adminRouter.get(
  "/admin/platform/schools",
  verifyToken,
  requireAdmin,
  getPlatformSchoolsHandler,
);
adminRouter.get(
  "/admin/platform/schools/:schoolId",
  verifyToken,
  requireAdmin,
  getPlatformSchoolDetailHandler,
);
adminRouter.get(
  "/admin/platform/users",
  verifyToken,
  requireAdmin,
  getPlatformUsersHandler,
);
adminRouter.get(
  "/admin/platform/activity",
  verifyToken,
  requireAdmin,
  getPlatformActivityHandler,
);
adminRouter.get(
  "/admin/platform/health",
  verifyToken,
  requireAdmin,
  getPlatformHealthHandler,
);

// ─────────────────────────────────────────────
// SCHOOL ADMIN — school-scoped routes
// Access: admin and school_admin
// ─────────────────────────────────────────────
adminRouter.get(
  "/admin/school/overview",
  verifyToken,
  requireSchoolAdmin,
  getSchoolOverviewHandler,
);
adminRouter.get(
  "/admin/school/users",
  verifyToken,
  requireSchoolAdmin,
  getSchoolUsersHandler,
);
adminRouter.get(
  "/admin/school/teachers",
  verifyToken,
  requireSchoolAdmin,
  getSchoolTeachersHandler,
);
adminRouter.get(
  "/admin/school/activity",
  verifyToken,
  requireSchoolAdmin,
  getSchoolActivityHandler,
);
adminRouter.get(
  "/admin/school/health",
  verifyToken,
  requireSchoolAdmin,
  getSchoolHealthHandler,
);

export {adminRouter};
