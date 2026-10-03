import {User} from "../src/database/model/users.js";
import {sendError} from "../utils/sendError.js";

/**
 * Blocks product endpoints for accounts whose email is not verified.
 *
 * Mount it AFTER checkToken and PER ROUTE, not with router.use(): server.js
 * mounts every router on the same "/api" path, so a router-level use() inside
 * dataRouter would also run for requests meant for demoRoute (/bookDemo is
 * public) and break them.
 *
 *   dataRouter.post("/gen-table", checkToken, requireVerified, genTimetableHandler);
 *
 * The frontend treats the `EMAIL_NOT_VERIFIED` code as "send the user to /verify".
 */
export const requireVerified = async (req, res, next) => {
  try {
    if (!req.userId) return sendError(res, "Not authenticated", 401);

    const user = await User.findById(req.userId).select("isVerified");
    if (!user) return sendError(res, "User not found", 401);

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address to continue.",
      });
    }
    next();
  } catch (error) {
    console.error("[requireVerified]", error);
    sendError(res, "Could not verify account status");
  }
};
