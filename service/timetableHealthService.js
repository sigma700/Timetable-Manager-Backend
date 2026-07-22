import {GenTable} from "../src/database/model/fullTable.js";

/**
 * Derives a health category from a numeric score.
 *
 * @param {number} score
 * @returns {string}
 */
const getHealthCategory = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "Critical";
};

/**
 * Computes a health score (0–100) for the most recent timetable of a school.
 * Analyses warnings, empty slots, unassigned teachers, and coverage gaps.
 *
 * @param {string} schoolId - ObjectId of the school
 * @returns {Promise<{
 *   timetableName: string,
 *   healthScore: number,
 *   category: string,
 *   totalPeriods: number,
 *   totalClasses: number,
 *   issues: Object,
 *   breakdown: Object,
 *   schoolId: string
 * }>}
 */
export const getTimetableHealth = async (schoolId) => {
  // Fetch the most recent timetable for the school
  const latestTimetable = await GenTable.findOne({school: schoolId})
    .sort({createdAt: -1})
    .lean();

  if (!latestTimetable) {
    return {
      timetableName: null,
      healthScore: 0,
      category: "Critical",
      totalPeriods: 0,
      totalClasses: 0,
      issues: {
        warnings: 0,
        emptySlots: 0,
        unassignedTeachers: 0,
        coverageGaps: 0,
      },
      breakdown: {
        warningPenalty: 0,
        emptySlotPenalty: 0,
        noTeacherPenalty: 0,
        coverageGapPenalty: 0,
      },
      schoolId,
    };
  }

  const totalClasses = latestTimetable.timetables?.length || 0;

  // Counters
  let totalPeriods = 0;
  let warnings = 0;
  let emptySlots = 0;
  let unassignedTeachers = 0;
  let coverageGaps = 0;

  // Traverse the nested timetable structure
  for (const classTimetable of latestTimetable.timetables || []) {
    // Track which days have at least one assigned period for this class
    const dayHasPeriod = {};

    for (const daySchedule of classTimetable.schedule || []) {
      const day = daySchedule.day;
      let dayHasAssignedPeriod = false;

      for (const period of daySchedule.periods || []) {
        // Skip break periods — they are not teaching slots
        if (period.isBreak) continue;

        totalPeriods += 1;

        // Warning flag — generator could not find an optimal assignment
        if (period.warning) warnings += 1;

        // Empty slot — no subject assigned
        if (!period.subject?._id) emptySlots += 1;

        // No teacher assigned for a teaching period
        if (!period.teacher?._id) unassignedTeachers += 1;

        // If any period has a subject, this day has coverage
        if (period.subject?._id) dayHasAssignedPeriod = true;
      }

      dayHasPeriod[day] = dayHasAssignedPeriod;
    }

    // Coverage gap — a class has an entire day with no assigned subjects
    const gapDays = Object.values(dayHasPeriod).filter((v) => !v).length;
    coverageGaps += gapDays;
  }

  // Compute penalty components
  const warningPenalty =
    totalPeriods > 0
      ? parseFloat(((warnings / totalPeriods) * 40).toFixed(2))
      : 0;

  const emptySlotPenalty =
    totalPeriods > 0
      ? parseFloat(((emptySlots / totalPeriods) * 30).toFixed(2))
      : 0;

  const noTeacherPenalty =
    totalPeriods > 0
      ? parseFloat(((unassignedTeachers / totalPeriods) * 20).toFixed(2))
      : 0;

  const coverageGapPenalty =
    totalClasses > 0
      ? parseFloat(((coverageGaps / totalClasses) * 10).toFixed(2))
      : 0;

  // Compute final health score — floor at 0
  const rawScore =
    100 -
    warningPenalty -
    emptySlotPenalty -
    noTeacherPenalty -
    coverageGapPenalty;

  const healthScore = parseFloat(Math.max(0, rawScore).toFixed(2));
  const category = getHealthCategory(healthScore);

  return {
    timetableName: latestTimetable.name,
    healthScore,
    category,
    totalPeriods,
    totalClasses,
    issues: {
      warnings,
      emptySlots,
      unassignedTeachers,
      coverageGaps,
    },
    breakdown: {
      warningPenalty,
      emptySlotPenalty,
      noTeacherPenalty,
      coverageGapPenalty,
    },
    schoolId,
  };
};
