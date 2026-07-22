import {ClassData} from "../src/database/model/classData.js";
import {GenTable} from "../src/database/model/fullTable.js";
import {Subject} from "../src/database/model/subjects.js";
import {ListOfTechers} from "../src/database/model/teachers.js";

/**
 * Returns a high-level analytics snapshot for a school.
 * All counts are scoped to the provided schoolId.
 * Queries run in parallel for performance.
 *
 * @param {string} schoolId - ObjectId of the school
 * @returns {Promise<{
 *   totalTeachers: number,
 *   totalSubjects: number,
 *   totalClasses: number,
 *   totalTimetables: number
 * }>}
 */
export const getInstitutionOverview = async (schoolId) => {
  const [totalTeachers, totalSubjects, totalClasses, totalTimetables] =
    await Promise.all([
      ListOfTechers.countDocuments({school: schoolId}),
      Subject.countDocuments({school: schoolId}),
      ClassData.countDocuments({school: schoolId}),
      GenTable.countDocuments({school: schoolId}),
    ]);

  return {
    totalTeachers,
    totalSubjects,
    totalClasses,
    totalTimetables,
  };
};
