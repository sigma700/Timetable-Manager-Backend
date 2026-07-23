import {User} from "../database/model/users.js";
import {getInstitutionOverview} from "../../service/institutionAnalyticsService.js";
import {getTeacherWorkload} from "../../service/teacherAnalyticsService.js";
import {getTimetableHealth} from "../../service/timetableHealthService.js";
import {getActivityFeed} from "../../service/activityService.js";
import {sendError, sendSucess} from "../../utils/sendError.js";

/**
 * Derives schoolId from the authenticated user.
 * Admin can optionally pass ?schoolId= to inspect any school.
 * school_admin is always scoped to their own school.
 */
const resolveSchoolId = async (req) => {
  const user = req.user; // Attached by requireSchoolAdmin middleware

  if (user.accountType === "admin" && req.query.schoolId) {
    return req.query.schoolId;
  }

  const populated = await User.findById(user._id).populate("school").lean();

  if (!populated?.school) return null;

  return populated.school._id;
};

/**
 * GET /api/admin/school/overview
 * Returns institution snapshot for the authenticated school.
 * Access: admin, school_admin.
 */
export const getSchoolOverviewHandler = async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);

    if (!schoolId) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const overview = await getInstitutionOverview(schoolId);
    return sendSucess(
      res,
      "School overview retrieved successfully",
      overview,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/school/users
 * Returns all users belonging to the authenticated school.
 * Query params: page, limit
 * Access: admin, school_admin.
 */
export const getSchoolUsersHandler = async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);

    if (!schoolId) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({school: schoolId})
        .select("-password -verToken -verTokenExpDate -resetPasscodeToken")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({school: schoolId}),
    ]);

    return sendSucess(
      res,
      "School users retrieved successfully",
      {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/school/teachers
 * Returns teacher workload analytics for the authenticated school.
 * Access: admin, school_admin.
 */
export const getSchoolTeachersHandler = async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);

    if (!schoolId) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const workload = await getTeacherWorkload(schoolId);
    return sendSucess(
      res,
      "School teachers retrieved successfully",
      workload,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/school/activity
 * Returns paginated activity feed for the authenticated school.
 * Query params: page, limit, event, eventCategory, startDate, endDate
 * Access: admin, school_admin.
 */
export const getSchoolActivityHandler = async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);

    if (!schoolId) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const {event, eventCategory, startDate, endDate} = req.query;

    const activity = await getActivityFeed({
      schoolId,
      page,
      limit,
      event: event || undefined,
      eventCategory: eventCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return sendSucess(
      res,
      "School activity retrieved successfully",
      activity,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/admin/school/health
 * Returns timetable health score for the authenticated school.
 * Access: admin, school_admin.
 */
export const getSchoolHealthHandler = async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);

    if (!schoolId) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const health = await getTimetableHealth(schoolId);
    return sendSucess(res, "School health retrieved successfully", health, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
