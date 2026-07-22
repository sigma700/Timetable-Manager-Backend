import {Router} from "express";
import {getInstitutionOverviewHandler} from "../controllers/analyticsController.js";
import {verifyToken} from "../../middleware/checkToken.js";

const analyticsRouter = Router();

analyticsRouter.get(
  "/analytics/overview",
  verifyToken,
  getInstitutionOverviewHandler,
);

export {analyticsRouter};
