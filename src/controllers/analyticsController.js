import {User} from "../database/model/users.js";
import {getInstitutionOverview} from "../../service/institutionAnalyticsService.js";
import {sendError, sendSucess} from "../../utils/sendError.js";

/**
 * GET /api/analytics/overview
 * Returns a high-level institution snapshot for the authenticated user's school.
 * Includes total counts for teachers, subjects, classes, and timetables.
 */
export const getInstitutionOverviewHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("school");

    if (!user || !user.school) {
      return sendError(res, "User is not associated with any school", 400);
    }

    const schoolId = user.school._id;

    const overview = await getInstitutionOverview(schoolId);

    return sendSucess(
      res,
      "Institution overview retrieved successfully",
      overview,
      200,
    );
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
