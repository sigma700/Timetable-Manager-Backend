import {
  getPlatformOverview,
  getPlatformSchools,
  getPlatformSchoolDetail,
  getPlatformUsers,
  getPlatformSystemHealth,
} from "../../service/platformAnalyticsService.js";
import {getActivityFeed} from "../../service/activityService.js";
import {sendError, sendSucess} from "../../utils/sendError.js";

/**
 * GET /api/admin/platform/overview
 * Returns platform-wide metrics across all schools.
 * Access: admin only.
 */
export const getPlatformOverviewHandler = async (req, res) => {
  try {
    const overview = await getPlatformOverview();
    return sendSucess(
      res,
      "Platform overview retrieved successfully",
      overview,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/platform/schools
 * Returns a paginated list of all schools with institution metrics.
 * Query params: page, limit
 * Access: admin only.
 */
export const getPlatformSchoolsHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const schools = await getPlatformSchools({page, limit});
    return sendSucess(res, "Schools retrieved successfully", schools, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/platform/schools/:schoolId
 * Returns detailed metrics for a single school.
 * Access: admin only.
 */
export const getPlatformSchoolDetailHandler = async (req, res) => {
  try {
    const {schoolId} = req.params;

    const school = await getPlatformSchoolDetail(schoolId);

    if (!school) {
      return sendError(res, "School not found", 404);
    }

    return sendSucess(res, "School detail retrieved successfully", school, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/platform/users
 * Returns a paginated list of all users across the platform.
 * Query params: page, limit, accountType
 * Access: admin only.
 */
export const getPlatformUsersHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const {accountType} = req.query;

    const users = await getPlatformUsers({
      page,
      limit,
      accountType: accountType || undefined,
    });

    return sendSucess(res, "Platform users retrieved successfully", users, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/platform/activity
 * Returns a platform-wide paginated activity feed across all schools.
 * Query params: page, limit, event, eventCategory, startDate, endDate
 * Access: admin only.
 */
export const getPlatformActivityHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const {event, eventCategory, startDate, endDate} = req.query;

    // Pass schoolId as null to get platform-wide activity
    const activity = await getActivityFeed({
      schoolId: null,
      page,
      limit,
      event: event || undefined,
      eventCategory: eventCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return sendSucess(
      res,
      "Platform activity retrieved successfully",
      activity,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/platform/health
 * Returns aggregate system health across all schools.
 * Access: admin only.
 */
export const getPlatformHealthHandler = async (req, res) => {
  try {
    const health = await getPlatformSystemHealth();
    return sendSucess(
      res,
      "Platform system health retrieved successfully",
      health,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
