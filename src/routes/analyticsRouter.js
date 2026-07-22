import {Router} from "express";
import {
  getInstitutionOverviewHandler,
  getTeacherWorkloadHandler,
  getSubjectDistributionHandler,
  getTimetableHealthHandler,
} from "../controllers/analyticsController.js";
import {verifyToken} from "../../middleware/checkToken.js";

const analyticsRouter = Router();

analyticsRouter.get(
  "/analytics/overview",
  verifyToken,
  getInstitutionOverviewHandler,
);
analyticsRouter.get(
  "/analytics/teachers",
  verifyToken,
  getTeacherWorkloadHandler,
);
analyticsRouter.get(
  "/analytics/subjects",
  verifyToken,
  getSubjectDistributionHandler,
);
analyticsRouter.get(
  "/analytics/health",
  verifyToken,
  getTimetableHealthHandler,
);

export {analyticsRouter};
