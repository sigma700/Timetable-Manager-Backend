import {School} from "../src/database/model/school.js";
import {User} from "../src/database/model/users.js";
import {GenTable} from "../src/database/model/fullTable.js";
import {ListOfTechers} from "../src/database/model/teachers.js";
import {ActivityLog} from "../src/database/model/activityLog.js";

/**
 * Returns a platform-wide overview for the super-admin dashboard.
 * Aggregates counts across all schools.
 *
 * @returns {Promise<Object>}
 */
export const getPlatformOverview = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const [
    totalSchools,
    totalUsers,
    totalTimetables,
    totalTeachers,
    newSchoolsThisMonth,
    newUsersThisMonth,
    platformActivityToday,
  ] = await Promise.all([
    School.countDocuments(),
    User.countDocuments(),
    GenTable.countDocuments(),
    ListOfTechers.countDocuments(),
    School.countDocuments({createdAt: {$gte: startOfMonth}}),
    User.countDocuments({createdAt: {$gte: startOfMonth}}),
    ActivityLog.countDocuments({createdAt: {$gte: startOfToday}}),
  ]);

  return {
    totalSchools,
    totalUsers,
    totalTimetables,
    totalTeachers,
    newSchoolsThisMonth,
    newUsersThisMonth,
    platformActivityToday,
  };
};

/**
 * Returns a paginated list of all schools with their institution metrics.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ schools: Array, total: number, page: number, totalPages: number }>}
 */
export const getPlatformSchools = async ({page = 1, limit = 20}) => {
  const skip = (page - 1) * limit;

  const [schools, total] = await Promise.all([
    School.find().sort({createdAt: -1}).skip(skip).limit(limit).lean(),
    School.countDocuments(),
  ]);

  // Enrich each school with institution metrics in parallel
  const enriched = await Promise.all(
    schools.map(async (school) => {
      const schoolId = school._id;

      const [totalTeachers, totalClasses, totalTimetables] = await Promise.all([
        ListOfTechers.countDocuments({school: schoolId}),
        (
          await import("../src/database/model/classData.js")
        ).ClassData.countDocuments({school: schoolId}),
        GenTable.countDocuments({school: schoolId}),
      ]);

      return {
        schoolId,
        name: school.name,
        totalTeachers,
        totalClasses,
        totalTimetables,
        createdAt: school.createdAt,
      };
    }),
  );

  return {
    schools: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Returns details for a single school including all institution metrics.
 *
 * @param {string} schoolId
 * @returns {Promise<Object>}
 */
export const getPlatformSchoolDetail = async (schoolId) => {
  const [school, totalTeachers, totalClasses, totalTimetables, totalUsers] =
    await Promise.all([
      School.findById(schoolId).lean(),
      ListOfTechers.countDocuments({school: schoolId}),
      (
        await import("../src/database/model/classData.js")
      ).ClassData.countDocuments({school: schoolId}),
      GenTable.countDocuments({school: schoolId}),
      User.countDocuments({school: schoolId}),
    ]);

  if (!school) return null;

  return {
    schoolId: school._id,
    name: school.name,
    address: school.address || null,
    contactEmail: school.contactEmail || null,
    phoneNumber: school.phoneNumber || null,
    totalTeachers,
    totalClasses,
    totalTimetables,
    totalUsers,
    createdAt: school.createdAt,
  };
};

/**
 * Returns a paginated list of all users across the platform.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.accountType] - Filter by role
 * @returns {Promise<{ users: Array, total: number, page: number, totalPages: number }>}
 */
export const getPlatformUsers = async ({page = 1, limit = 20, accountType}) => {
  const skip = (page - 1) * limit;
  const filter = {};

  if (accountType) filter.accountType = accountType;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -verToken -verTokenExpDate -resetPasscodeToken")
      .populate("school", "name")
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Returns aggregate system health across all schools.
 * Computes average health score and flags critical schools.
 *
 * @returns {Promise<Object>}
 */
export const getPlatformSystemHealth = async () => {
  const schools = await School.find().lean();

  const {getTimetableHealth} = await import("./timetableHealthService.js");

  const healthResults = await Promise.all(
    schools.map(async (school) => {
      const health = await getTimetableHealth(school._id);
      return {
        schoolId: school._id,
        schoolName: school.name,
        healthScore: health.healthScore,
        category: health.category,
      };
    }),
  );

  const totalSchools = healthResults.length;
  const averageHealthScore =
    totalSchools > 0
      ? parseFloat(
          (
            healthResults.reduce((sum, h) => sum + h.healthScore, 0) /
            totalSchools
          ).toFixed(2),
        )
      : 0;

  const criticalSchools = healthResults.filter(
    (h) => h.category === "Critical",
  );
  const needsAttentionSchools = healthResults.filter(
    (h) => h.category === "Needs Attention",
  );

  return {
    averageHealthScore,
    totalSchools,
    criticalSchools: criticalSchools.length,
    needsAttentionSchools: needsAttentionSchools.length,
    schoolBreakdown: healthResults,
  };
};
