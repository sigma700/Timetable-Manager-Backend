import {Router} from "express";
import {
  getInstitutionOverviewHandler,
  getTeacherWorkloadHandler,
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

export {analyticsRouter};
