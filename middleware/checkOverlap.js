import {GenTable} from "../database/model/fullTable.js";

const VALID_DAYS = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
]);

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class TimetableValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimetableValidationError";
    this.code = "TIMETABLE_VALIDATION_ERROR";
  }
}

export class TimetableConflictError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = "TimetableConflictError";
    this.code = "TIMETABLE_CONFLICT";
    Object.assign(this, meta);
  }
}

function toMinutes(value, label) {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new TimetableValidationError(
      `${label} must be a zero-padded 24-hour "HH:MM" string (e.g. "08:00"). Got: ${JSON.stringify(
        value,
      )}`,
    );
  }
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function describeConflict(doc, type) {
  const subjectName = doc.subject?.name ?? "an unknown subject";
  if (type === "teacher") {
    const className = doc.class?.name ?? "an unknown class";
    return `Teacher already has ${subjectName} in ${className} at ${doc.startTime}-${doc.endTime}`;
  }
  const teacherName = doc.teacher
    ? `${doc.teacher.firstName ?? ""} ${doc.teacher.lastName ?? ""}`.trim() ||
      "an unknown teacher"
    : "an unknown teacher";
  return `Classroom is already occupied by ${subjectName} (Teacher: ${teacherName}) at ${doc.startTime}-${doc.endTime}`;
}

/**
 * Checks a proposed timetable entry for teacher and classroom conflicts.
 *
 * @param {object} newClass - { day, startTime, endTime, teacher, class, subject }
 * @param {string|null} excludeId - current document's _id, when updating
 * @param {import('mongoose').ClientSession} [session] - active Mongo session.
 *   Pass this (and have the caller perform the eventual insert/update inside
 *   the SAME transaction) to close the check-then-write race: without a
 *   shared transaction, two requests can both run this check, both see "no
 *   conflict", and both write — landing two overlapping bookings anyway.
 *   This function alone cannot prevent that; it can only avoid making it
 *   worse. See note at the bottom of this file for the indexing/locking
 *   this assumes.
 */
export const checkTimetableConflict = async (
  newClass,
  excludeId = null,
  session = null,
) => {
  // ── Fail fast on bad input before touching the DB ──────────────────────
  if (!newClass || typeof newClass !== "object") {
    throw new TimetableValidationError("newClass payload is required.");
  }
  if (!VALID_DAYS.has(newClass.day)) {
    throw new TimetableValidationError(
      `day must be one of ${[...VALID_DAYS].join(", ")}. Got: ${JSON.stringify(
        newClass.day,
      )}`,
    );
  }
  if (!newClass.teacher) {
    throw new TimetableValidationError("teacher is required.");
  }
  if (!newClass.class) {
    throw new TimetableValidationError("class is required.");
  }

  const startMinutes = toMinutes(newClass.startTime, "startTime");
  const endMinutes = toMinutes(newClass.endTime, "endTime");

  if (endMinutes <= startMinutes) {
    throw new TimetableValidationError("End time must be after start time.");
  }

  // Base query excludes the current document during updates.
  const baseQuery = {};
  if (excludeId) baseQuery._id = {$ne: excludeId};

  const overlapClause = {
    startTime: {$lt: newClass.endTime},
    endTime: {$gt: newClass.startTime},
  };

  const queryOptions = session ? {session} : {};

  const [teacherConflict, classroomConflict] = await Promise.all([
    GenTable.findOne(
      {
        ...baseQuery,
        day: newClass.day,
        teacher: newClass.teacher,
        ...overlapClause,
      },
      null,
      queryOptions,
    )
      .populate("subject", "name")
      .populate("class", "name"),
    GenTable.findOne(
      {
        ...baseQuery,
        day: newClass.day,
        class: newClass.class,
        ...overlapClause,
      },
      null,
      queryOptions,
    )
      .populate("subject", "name")
      .populate("teacher", "firstName lastName"),
  ]);

  if (teacherConflict) {
    throw new TimetableConflictError(
      describeConflict(teacherConflict, "teacher"),
      {
        conflictType: "teacher",
        conflictingId: teacherConflict._id,
      },
    );
  }

  if (classroomConflict) {
    throw new TimetableConflictError(
      describeConflict(classroomConflict, "classroom"),
      {
        conflictType: "classroom",
        conflictingId: classroomConflict._id,
      },
    );
  }

  return {startMinutes, endMinutes};
};
