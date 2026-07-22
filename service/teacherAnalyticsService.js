import {GenTable} from "../src/database/model/fullTable.js";
import {ListOfTechers} from "../src/database/model/teachers.js";

/**
 * Returns workload analytics for all teachers in a school.
 * Computes assigned periods, weekly/daily load, utilization, subject and class counts.
 *
 * @param {string} schoolId - ObjectId of the school
 * @returns {Promise<{
 *   teachers: Array,
 *   totalTeachers: number,
 *   schoolId: string
 * }>}
 */
export const getTeacherWorkload = async (schoolId) => {
  // Fetch all teachers for the school
  const teachers = await ListOfTechers.find({school: schoolId})
    .populate("subjects", "name")
    .populate("classes", "name")
    .lean();

  // Fetch the most recent timetable for the school
  const latestTimetable = await GenTable.findOne({school: schoolId})
    .sort({createdAt: -1})
    .lean();

  // Derive periodsPerDay from timetable config — fallback to 8
  const periodsPerDay = latestTimetable?.config?.periodsPerDay || 8;
  const maxPeriodsPerWeek = periodsPerDay * 5; // 5 school days

  // Build a period count map keyed by teacher._id string
  // { teacherId: { total: number, byDay: { Monday: number, ... } } }
  const periodCountMap = {};

  if (latestTimetable?.timetables?.length) {
    for (const classTimetable of latestTimetable.timetables) {
      for (const daySchedule of classTimetable.schedule || []) {
        const day = daySchedule.day;
        for (const period of daySchedule.periods || []) {
          // Skip breaks and unassigned periods
          if (period.isBreak || !period.teacher?._id) continue;

          const teacherId = period.teacher._id.toString();

          if (!periodCountMap[teacherId]) {
            periodCountMap[teacherId] = {total: 0, byDay: {}};
          }

          periodCountMap[teacherId].total += 1;
          periodCountMap[teacherId].byDay[day] =
            (periodCountMap[teacherId].byDay[day] || 0) + 1;
        }
      }
    }
  }

  // Build analytics result for each teacher
  const teacherWorkload = teachers.map((teacher) => {
    const teacherId = teacher._id.toString();
    const counts = periodCountMap[teacherId] || {total: 0, byDay: {}};

    const weeklyLoad = counts.total;
    const dailyLoad = parseFloat((weeklyLoad / 5).toFixed(2));
    const utilizationPercent =
      maxPeriodsPerWeek > 0
        ? parseFloat(((weeklyLoad / maxPeriodsPerWeek) * 100).toFixed(2))
        : 0;

    return {
      teacherId: teacher._id,
      teacherName: teacher.name,
      assignedPeriods: weeklyLoad,
      weeklyLoad,
      dailyLoad,
      utilizationPercent,
      subjectCount: teacher.subjects?.length || 0,
      classCount: teacher.classes?.length || 0,
      subjects: teacher.subjects?.map((s) => s.name) || [],
      classes: teacher.classes?.map((c) => c.name) || [],
      periodsByDay: counts.byDay,
    };
  });

  // Sort by weeklyLoad descending — busiest teachers first
  teacherWorkload.sort((a, b) => b.weeklyLoad - a.weeklyLoad);

  return {
    teachers: teacherWorkload,
    totalTeachers: teachers.length,
    periodsPerDay,
    maxPeriodsPerWeek,
    schoolId,
  };
};
