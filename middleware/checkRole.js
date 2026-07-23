import {User} from "../src/database/model/users.js";
import {sendError} from "../utils/sendError.js";

/**
 * Middleware — allows access to platform-wide admin endpoints.
 * Permits: admin only.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    if (user.accountType !== "admin") {
      return sendError(
        res,
        "Access denied. Platform admin rights required.",
        403,
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

/**
 * Middleware — allows access to school-level admin endpoints.
 * Permits: admin and school_admin.
 */
export const requireSchoolAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    if (!["admin", "school_admin"].includes(user.accountType)) {
      return sendError(
        res,
        "Access denied. School admin rights required.",
        403,
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};
