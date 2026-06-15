import mongoose from "mongoose";
import {ActivityLog} from "../src/database/model/activityLog.js";

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

/**
 * Tracks a platform activity event.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {Object} params
 * @param {string}  params.event          - Standardized event name e.g. 'USER_LOGGED_IN'
 * @param {string}  params.eventCategory  - Category e.g. 'AUTH', 'TIMETABLE'
 * @param {string}  params.userId         - ObjectId of the user performing the action
 * @param {string}  [params.schoolId]     - ObjectId of the school (optional for pre-school events)
 * @param {Object}  [params.metadata]     - Event-specific analytics payload
 * @param {string}  [params.source]       - Origin: 'WEB' | 'API' | 'SYSTEM'
 */
export const trackActivity = async ({
  event,
  eventCategory,
  userId,
  schoolId = null,
  metadata = {},
  source = "WEB",
}) => {
  try {
    await ActivityLog.create({
      event,
      eventCategory,
      source,
      userId,
      schoolId,
      metadata,
    });
  } catch (error) {
    // Logging must never break the main operation
    console.warn(
      `[ActivityService] Failed to track event "${event}":`,
      error.message,
    );
  }
};

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/**
 * Returns the most recent activity entries for a school.
 * Designed for dashboard widgets — no pagination, fast query.
 *
 * @param {string} schoolId
 * @param {number} [limit=10]  - Max 20
 * @returns {Promise<Array>}
 */
export const getRecentActivity = async (schoolId, limit = 10) => {
  const safeLimit = Math.min(limit, 100);

  const activities = await ActivityLog.find({schoolId})
    .sort({createdAt: -1})
    .limit(safeLimit)
    .populate("userId", "firstName lastName email")
    .lean();

  return activities;
};

/**
 * Returns a paginated, filterable activity feed for a school.
 * Supports filtering by event, eventCategory, and date range.
 *
 * @param {Object} params
 * @param {string}  params.schoolId
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=20]
 * @param {string}  [params.event]          - Filter by specific event name
 * @param {string}  [params.eventCategory]  - Filter by category
 * @param {string}  [params.startDate]      - ISO date string
 * @param {string}  [params.endDate]        - ISO date string
 * @returns {Promise<{ activities: Array, total: number, page: number, totalPages: number }>}
 */
export const getActivityFeed = async ({
  schoolId,
  page = 1,
  limit = 20,
  event,
  eventCategory,
  startDate,
  endDate,
}) => {
  const matchStage = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
  };

  if (event) matchStage.event = event;
  if (eventCategory) matchStage.eventCategory = eventCategory;

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [result] = await ActivityLog.aggregate([
    {$match: matchStage},
    {
      $facet: {
        activities: [
          {$sort: {createdAt: -1}},
          {$skip: skip},
          {$limit: limit},
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
              pipeline: [{$project: {firstName: 1, lastName: 1, email: 1}}],
            },
          },
          {
            $addFields: {
              user: {$arrayElemAt: ["$user", 0]},
            },
          },
        ],
        totalCount: [{$count: "count"}],
      },
    },
  ]);

  const activities = result?.activities || [];
  const total = result?.totalCount?.[0]?.count || 0;

  return {
    activities,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Returns a count of activities grouped by event type for a school.
 * Designed for institution analytics and dashboard summary cards.
 *
 * @param {Object} params
 * @param {string}  params.schoolId
 * @param {string}  [params.eventCategory]  - Optionally scope to one category
 * @param {string}  [params.startDate]      - ISO date string
 * @param {string}  [params.endDate]        - ISO date string
 * @returns {Promise<Object>}  e.g. { USER_LOGGED_IN: 42, TIMETABLE_GENERATED: 5 }
 */
export const getActivitySummary = async ({
  schoolId,
  eventCategory,
  startDate,
  endDate,
}) => {
  const matchStage = {schoolId};

  if (eventCategory) matchStage.eventCategory = eventCategory;

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const grouped = await ActivityLog.aggregate([
    {$match: matchStage},
    {
      $group: {
        _id: "$event",
        count: {$sum: 1},
        lastOccurred: {$max: "$createdAt"},
      },
    },
    {$sort: {count: -1}},
  ]);

  // Shape into a flat object for easy dashboard consumption
  // { USER_LOGGED_IN: { count: 42, lastOccurred: Date }, ... }
  const summary = {};
  for (const entry of grouped) {
    summary[entry._id] = {
      count: entry.count,
      lastOccurred: entry.lastOccurred,
    };
  }

  return summary;
};
