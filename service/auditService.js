import {AuditLog} from "../src/database/model/auditLog.js";

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

/**
 * Creates an audit log entry.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {Object} params
 * @param {string}  params.action           - Standardized action name e.g. 'USER_LOGIN'
 * @param {string}  params.actionCategory   - Category e.g. 'AUTH', 'TIMETABLE'
 * @param {string}  params.performedBy      - ObjectId of the user performing the action
 * @param {string}  [params.targetId]       - ObjectId of the affected entity
 * @param {string}  [params.targetModel]    - Collection name of the affected entity
 * @param {*}       [params.previousValue]  - State before the action
 * @param {*}       [params.newValue]       - State after the action
 * @param {string}  [params.ipAddress]      - Requester IP address
 * @param {string}  [params.userAgent]      - Requester user agent string
 * @param {string}  [params.schoolId]       - School scope (null for platform actions)
 */
export const createAuditLog = async ({
  action,
  actionCategory,
  performedBy,
  targetId = null,
  targetModel = null,
  previousValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  schoolId = null,
}) => {
  try {
    await AuditLog.create({
      action,
      actionCategory,
      performedBy,
      targetId,
      targetModel,
      previousValue,
      newValue,
      ipAddress,
      userAgent,
      schoolId,
    });
  } catch (error) {
    // Audit logging must never break the main operation
    console.warn(
      `[AuditService] Failed to create audit log for "${action}":`,
      error.message,
    );
  }
};

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/**
 * Returns a paginated, filterable audit log feed.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=20]
 * @param {string}  [params.action]          - Filter by action name
 * @param {string}  [params.actionCategory]  - Filter by category
 * @param {string}  [params.startDate]       - ISO date string
 * @param {string}  [params.endDate]         - ISO date string
 * @returns {Promise<{ logs: Array, total: number, page: number, totalPages: number }>}
 */
export const getAuditFeed = async ({
  page = 1,
  limit = 20,
  action,
  actionCategory,
  startDate,
  endDate,
}) => {
  const matchStage = {};

  if (action) matchStage.action = action;
  if (actionCategory) matchStage.actionCategory = actionCategory;

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [result] = await AuditLog.aggregate([
    {$match: matchStage},
    {
      $facet: {
        logs: [
          {$sort: {createdAt: -1}},
          {$skip: skip},
          {$limit: limit},
          {
            $lookup: {
              from: "users",
              localField: "performedBy",
              foreignField: "_id",
              as: "performer",
              pipeline: [
                {
                  $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    accountType: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              performer: {$arrayElemAt: ["$performer", 0]},
            },
          },
        ],
        totalCount: [{$count: "count"}],
      },
    },
  ]);

  const logs = result?.logs || [];
  const total = result?.totalCount?.[0]?.count || 0;

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Returns the most recent audit entries.
 * Designed for the super admin dashboard widget.
 *
 * @param {number} [limit=10] - Max 20
 * @returns {Promise<Array>}
 */
export const getRecentAuditLogs = async (limit = 10) => {
  const safeLimit = Math.min(limit, 20);

  const logs = await AuditLog.find()
    .sort({createdAt: -1})
    .limit(safeLimit)
    .populate("performedBy", "firstName lastName email accountType")
    .lean();

  return logs;
};

/**
 * Returns all audit entries performed by a specific user.
 *
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{ logs: Array, total: number, page: number, totalPages: number }>}
 */
export const getAuditLogsByUser = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({performedBy: userId})
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments({performedBy: userId}),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Returns all audit entries scoped to a specific school.
 *
 * @param {string} schoolId
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{ logs: Array, total: number, page: number, totalPages: number }>}
 */
export const getAuditLogsBySchool = async (schoolId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({schoolId})
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit)
      .populate("performedBy", "firstName lastName email accountType")
      .lean(),
    AuditLog.countDocuments({schoolId}),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
