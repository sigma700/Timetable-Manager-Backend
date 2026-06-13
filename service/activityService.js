import {ActivityLog} from "../src/database/model/activityLog.js";

/**
 * Tracks a platform activity event.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {Object} params
 * @param {string} params.event
 * @param {string} params.eventCategory
 * @param {string} params.userId
 * @param {string} [params.schoolId]
 * @param {Object} [params.metadata]
 * @param {string} [params.source]
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
    console.warn(
      `[ActivityService] Failed to track event "${event}":`,
      error.message,
    );
  }
};
