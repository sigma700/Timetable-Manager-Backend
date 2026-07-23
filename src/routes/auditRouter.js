import {Router} from "express";
import {
  getAuditFeedHandler,
  getRecentAuditHandler,
  getAuditByUserHandler,
  getAuditBySchoolHandler,
} from "../controllers/auditController.js";
import {verifyToken} from "../../middleware/checkToken.js";
import {requireAdmin} from "../../middleware/checkRole.js";

const auditRouter = Router();

// All audit routes are super admin only
auditRouter.get(
  "/audit/recent",
  verifyToken,
  requireAdmin,
  getRecentAuditHandler,
);
auditRouter.get("/audit", verifyToken, requireAdmin, getAuditFeedHandler);
auditRouter.get(
  "/audit/user/:userId",
  verifyToken,
  requireAdmin,
  getAuditByUserHandler,
);
auditRouter.get(
  "/audit/school/:schoolId",
  verifyToken,
  requireAdmin,
  getAuditBySchoolHandler,
);

export {auditRouter};
