import {User} from "../database/model/users.js";
import {
  getActivityFeed,
  getActivitySummary,
  getRecentActivity,
} from "../../service/activityService.js";
import {sendError, sendSucess} from "../../utils/sendError.js";

/**
 * GET /api/activity/recent
 * Returns the most recent activity entries for the authenticated user's school.
 * Designed for dashboard widgets.
 */
export const getRecentActivityHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("school");

    if (!user || !user.school) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const schoolId = user.school._id;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await getRecentActivity(schoolId, limit);

    return sendSucess(
      res,
      "Recent activity retrieved successfully",
      activities,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/activity
 * Returns a paginated, filterable activity feed for the authenticated user's school.
 * Query params: page, limit, event, eventCategory, startDate, endDate
 */
export const getActivityFeedHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("school");

    if (!user || !user.school) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const schoolId = user.school._id;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const {event, eventCategory, startDate, endDate} = req.query;

    const result = await getActivityFeed({
      schoolId,
      page,
      limit,
      event: event || undefined,
      eventCategory: eventCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return sendSucess(res, "Activity feed retrieved successfully", result, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/activity/summary
 * Returns activity counts grouped by event type for the authenticated user's school.
 * Query params: eventCategory, startDate, endDate
 */
export const getActivitySummaryHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("school");

    if (!user || !user.school) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const schoolId = user.school._id;
    const {eventCategory, startDate, endDate} = req.query;

    const summary = await getActivitySummary({
      schoolId,
      eventCategory: eventCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return sendSucess(
      res,
      "Activity summary retrieved successfully",
      summary,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
