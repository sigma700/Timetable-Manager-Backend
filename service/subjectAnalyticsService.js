import {GenTable} from "../src/database/model/fullTable.js";
import {Subject} from "../src/database/model/subjects.js";

/**
 * Returns subject distribution analytics for a school.
 * Computes periods per subject, allocation %, class count, and daily average.
 *
 * @param {string} schoolId - ObjectId of the school
 * @returns {Promise<{
 *   subjects: Array,
 *   totalSubjects: number,
 *   totalPeriods: number,
 *   schoolId: string
 * }>}
 */
export const getSubjectDistribution = async (schoolId) => {
  // Fetch all subjects registered for the school
  const subjects = await Subject.find({school: schoolId}).lean();

  // Fetch the most recent timetable for the school
  const latestTimetable = await GenTable.findOne({school: schoolId})
    .sort({createdAt: -1})
    .lean();

  // Build subject period count map keyed by subject._id string
  // { subjectId: { total: number, classes: Set<string> } }
  const subjectCountMap = {};
  let totalPeriods = 0;

  if (latestTimetable?.timetables?.length) {
    for (const classTimetable of latestTimetable.timetables) {
      const className = classTimetable.name;

      for (const daySchedule of classTimetable.schedule || []) {
        for (const period of daySchedule.periods || []) {
          // Skip breaks and unassigned periods
          if (period.isBreak || !period.subject?._id) continue;

          totalPeriods += 1;

          const subjectId = period.subject._id.toString();

          if (!subjectCountMap[subjectId]) {
            subjectCountMap[subjectId] = {
              total: 0,
              classes: new Set(),
            };
          }

          subjectCountMap[subjectId].total += 1;
          subjectCountMap[subjectId].classes.add(className);
        }
      }
    }
  }

  // Build analytics result for each subject
  const subjectDistribution = subjects.map((subject) => {
    const subjectId = subject._id.toString();
    const counts = subjectCountMap[subjectId] || {total: 0, classes: new Set()};

    const periodsAssigned = counts.total;
    const allocationPercent =
      totalPeriods > 0
        ? parseFloat(((periodsAssigned / totalPeriods) * 100).toFixed(2))
        : 0;
    const dailyAverage = parseFloat((periodsAssigned / 5).toFixed(2));
    const classCount = counts.classes.size;

    return {
      subjectId: subject._id,
      subjectName: subject.name,
      periodsAssigned,
      allocationPercent,
      classCount,
      dailyAverage,
    };
  });

  // Sort by periodsAssigned descending — most allocated subjects first
  subjectDistribution.sort((a, b) => b.periodsAssigned - a.periodsAssigned);

  return {
    subjects: subjectDistribution,
    totalSubjects: subjects.length,
    totalPeriods,
    schoolId,
  };
};
