import {User} from "../database/model/users.js";
import {sendError, sendSucess} from "../../utils/sendError.js";
import {toSafeUser} from "../../utils/safeUser.js";

// GET /api/check-Auth — the single source of truth the frontend boots from.
//
// It intentionally returns unverified and school-less users too: the client
// needs them in order to route people to /verify or /onboarding.
//
// Removed: `import { use } from 'react'` (unused, and React is not a backend
// dependency) and the raw `sendSucess(res, ..., user)` that leaked the password
// hash and the verification code.
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("school", "name");
    if (!user) {
      return sendError(res, "User not found!", 401);
    }
    sendSucess(res, "Success", toSafeUser(user), 200);
  } catch (error) {
    console.error(error);
    sendError(res, error.message);
  }
};
