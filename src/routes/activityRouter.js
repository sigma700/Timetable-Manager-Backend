import {Router} from "express";
import {
  getActivityFeedHandler,
  getActivitySummaryHandler,
  getRecentActivityHandler,
} from "../controllers/activityController.js";
import {verifyToken} from "../../middleware/checkToken.js";

const activityRouter = Router();

activityRouter.get("/activity/recent", verifyToken, getRecentActivityHandler);
activityRouter.get("/activity", verifyToken, getActivityFeedHandler);
activityRouter.get("/activity/summary", verifyToken, getActivitySummaryHandler);

export {activityRouter};
