import {
  getAuditFeed,
  getRecentAuditLogs,
  getAuditLogsByUser,
  getAuditLogsBySchool,
} from "../../service/auditService.js";
import {sendError, sendSucess} from "../../utils/sendError.js";

/**
 * GET /api/audit
 * Returns a paginated, filterable audit log feed.
 * Query params: page, limit, action, actionCategory, startDate, endDate
 * Access: admin only.
 */
export const getAuditFeedHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const {action, actionCategory, startDate, endDate} = req.query;

    const result = await getAuditFeed({
      page,
      limit,
      action: action || undefined,
      actionCategory: actionCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return sendSucess(res, "Audit log retrieved successfully", result, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/audit/recent
 * Returns the most recent audit entries.
 * Query params: limit
 * Access: admin only.
 */
export const getRecentAuditHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const logs = await getRecentAuditLogs(limit);

    return sendSucess(
      res,
      "Recent audit logs retrieved successfully",
      logs,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/audit/user/:userId
 * Returns all audit entries performed by a specific user.
 * Query params: page, limit
 * Access: admin only.
 */
export const getAuditByUserHandler = async (req, res) => {
  try {
    const {userId} = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!userId) {
      return sendError(res, "User ID is required", 400);
    }

    const result = await getAuditLogsByUser(userId, page, limit);

    return sendSucess(
      res,
      "User audit logs retrieved successfully",
      result,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * GET /api/audit/school/:schoolId
 * Returns all audit entries scoped to a specific school.
 * Query params: page, limit
 * Access: admin only.
 */
export const getAuditBySchoolHandler = async (req, res) => {
  try {
    const {schoolId} = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    const result = await getAuditLogsBySchool(schoolId, page, limit);

    return sendSucess(
      res,
      "School audit logs retrieved successfully",
      result,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
