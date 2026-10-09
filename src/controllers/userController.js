//here is where we perform all the logical for designing all the endpoints

import {User} from "../database/model/users.js";
import bcrypt from "bcrypt";
import {genJwTok} from "../../utils/genJwToken.js";
import {generateToken} from "../../utils/genToken.js";
import {School} from "../database/model/school.js";
import {sendError, sendSucess} from "../../utils/sendError.js";
import {trackActivity} from "../../service/activityService.js";
import {createAuditLog} from "../../service/auditService.js";
import {timingSafeEqual} from "node:crypto";
import {sendVerMail, senWelMail} from "../../resend/sendEmail.js";
import {toSafeUser} from "../../utils/safeUser.js";

const CODE_TTL_MS = 24 * 60 * 60 * 1000; // was 24 * 60 * 1000 = 24 MINUTES
const RESEND_COOLDOWN_MS = 60 * 1000; // matches the 60s timer on the Verif page
const MAX_CODE_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sameCode = (a, b) => {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
};

// Email delivery must not block signup or verification responses. If it fails
// the user can press "Resend code".
const deliverCode = (user, code) => {
  void sendVerMail(code, user.email).catch((err) => {
    console.error("[verification email failed]", err?.message || err);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV ONLY] verification code for ${user.email}: ${code}`);
    }
  });
};


export const createTeacher = async (req, res) => {
  const {firstName, lastName, password, email, contacts} = req.body;
  try {
    if (!email || !password || !firstName || !lastName) {
      return sendError(res, "Please fill out the required areas !", 400);
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      return sendError(res, "Please enter a valid email address !", 400);
    }
    if (String(password).length < 8) {
      return sendError(res, "Password must be at least 8 characters !", 400);
    }

    if (await User.findOne({email: cleanEmail})) {
      return sendError(res, "An account with this email already exists !", 409);
    }

    const hashedPass = await bcrypt.hash(password, 12);
    const verToken = generateToken();

    // isVerified stays FALSE (schema default). Previously this controller set
    // `teacher.isVerified = true` in memory without saving: the client was told
    // the account was verified while the database said otherwise.
    const teacher = await User.create({
      firstName,
      lastName,
      email: cleanEmail,
      password: hashedPass,
      verToken,
      verTokenExpDate: Date.now() + CODE_TTL_MS,
      verSentAt: new Date(),
      verAttempts: 0,
      contacts,
    });

    genJwTok(res, teacher._id);
    deliverCode(teacher, verToken);

    trackActivity({
      event: "USER_REGISTERED",
      eventCategory: "AUTH",
      userId: teacher._id,
      schoolId: null,
      metadata: {
        entityId: teacher._id,
        entityName: `${teacher.firstName} ${teacher.lastName}`,
        entityEmail: teacher.email,
      },
    });

    createAuditLog({
      action: "USER_REGISTER",
      actionCategory: "AUTH",
      performedBy: teacher._id,
      targetId: teacher._id,
      targetModel: "User",
      previousValue: null,
      newValue: {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        accountType: teacher.accountType,
      },
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: null,
    });

    sendSucess(res, "Successfully created new user !", toSafeUser(teacher), 201);
  } catch (error) {
    console.log(error);
    if (error?.code === 11000) {
      return sendError(res, "An account with this email already exists !", 409);
    }
    res.status(500).json({
      success: false,
      message: "An error occured on our end !",
    });
  }
};

export const login = async (req, res) => {
  // `school` route param (the hardcoded id in the frontend URL) was never used.
  const {email, password} = req.body;
  try {
    if (!email || !password) {
      return sendError(res, "Please enter your email and password !", 400);
    }
    const alrExists = await User.findOne({
      email: String(email).trim().toLowerCase(),
    });
    if (!alrExists) {
      return sendError(
        res,
        "Oops looks like you do not have an account !",
        401,
      );
    }

    // Google-only accounts have no password; bcrypt.compare(x, null) throws.
    if (!alrExists.password) {
      return sendError(
        res,
        "This account uses Google sign-in. Please continue with Google.",
        400,
      );
    }

    const passValid = await bcrypt.compare(password, alrExists.password);

    if (!passValid) {
      return sendError(res, "Incorrect password try again !", 401);
    }

    genJwTok(res, alrExists._id);

    trackActivity({
      event: "USER_LOGGED_IN",
      eventCategory: "AUTH",
      userId: alrExists._id,
      schoolId: alrExists.school || null,
      metadata: {
        entityId: alrExists._id,
        entityName: `${alrExists.firstName} ${alrExists.lastName}`,
        entityEmail: alrExists.email,
      },
    });

    createAuditLog({
      action: "USER_LOGIN",
      actionCategory: "AUTH",
      performedBy: alrExists._id,
      targetId: alrExists._id,
      targetModel: "User",
      previousValue: null,
      newValue: null,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: alrExists.school || null,
    });

    return sendSucess(res, "Logged in !", toSafeUser(alrExists), 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

// POST /api/verify  — MUST be mounted behind checkToken.
// The code is checked against the SIGNED-IN user only. Previously it searched
// every user for a matching code, so one person's code could verify another
// account, with no limit on guesses.
export const veriAcc = async (req, res) => {
  const {code} = req.body;

  if (!code) {
    return sendError(res, "Please have the code !", 400);
  }
  if (!req.userId) {
    return sendError(res, "Please sign in to verify your account !", 401);
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, "User not found !", 401);

    if (user.isVerified) {
      return sendSucess(res, "Already verified !", toSafeUser(user), 200);
    }

    const expired = !user.verTokenExpDate || user.verTokenExpDate < Date.now();
    if (!user.verToken || expired) {
      return res.status(401).json({
        success: false,
        code: "CODE_EXPIRED",
        message: "This code has expired. Please request a new one !",
      });
    }
    if ((user.verAttempts || 0) >= MAX_CODE_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        code: "TOO_MANY_ATTEMPTS",
        message: "Too many incorrect attempts. Please request a new code !",
      });
    }

    if (!sameCode(user.verToken, String(code).trim())) {
      user.verAttempts = (user.verAttempts || 0) + 1;
      await user.save();
      return sendError(res, "That code is not correct !", 401);
    }

    user.isVerified = true;
    user.verToken = undefined;
    user.verTokenExpDate = undefined;
    user.verAttempts = 0;
    await user.save();

    trackActivity({
      event: "USER_EMAIL_VERIFIED",
      eventCategory: "AUTH",
      userId: user._id,
      schoolId: user.school || null,
      metadata: {
        entityId: user._id,
        entityName: `${user.firstName} ${user.lastName}`,
        entityEmail: user.email,
      },
    });

    createAuditLog({
      action: "USER_EMAIL_VERIFIED",
      actionCategory: "AUTH",
      performedBy: user._id,
      targetId: user._id,
      targetModel: "User",
      previousValue: {isVerified: false},
      newValue: {isVerified: true},
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: user.school || null,
    });

    // The account is already verified; sending a welcome email must not delay
    // or change the successful verification response.
    void senWelMail(user.email, user.firstName).catch((err) => {
      console.error("[welcome email failed]", err?.message || err);
    });

    sendSucess(res, "Verified !", toSafeUser(user), 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

// POST /api/resend-verification — NEW; MUST be mounted behind checkToken.
// The Verif page already had a "Resend code" button, but nothing behind it.
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, "User not found !", 401);
    if (user.isVerified) {
      return sendSucess(res, "Already verified !", toSafeUser(user), 200);
    }

    const waitMs =
      user.verSentAt ? RESEND_COOLDOWN_MS - (Date.now() - user.verSentAt) : 0;
    if (waitMs > 0) {
      return res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`,
      });
    }

    const verToken = generateToken();
    user.verToken = verToken;
    user.verTokenExpDate = Date.now() + CODE_TTL_MS;
    user.verSentAt = new Date();
    user.verAttempts = 0;
    await user.save();

    deliverCode(user, verToken);
    sendSucess(res, "A new code has been sent !", null, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

//algorithm for logout functionality
export const logout = async (req, res) => {
  try {
    const userId = req.userId; // Your middleware attaches userId, not user object

    // Track the logout activity if we have user info
    if (userId) {
      // Optional: fetch user details for better activity tracking
      const user = await User.findById(userId).select(
        "firstName lastName email school",
      );

      if (user) {
        trackActivity({
          event: "USER_LOGGED_OUT",
          eventCategory: "AUTH",
          userId: userId,
          schoolId: user.school || null,
          metadata: {
            entityId: userId,
            entityName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            entityEmail: user.email || "",
          },
        });

        createAuditLog({
          action: "USER_LOGOUT",
          actionCategory: "AUTH",
          performedBy: userId,
          targetId: userId,
          targetModel: "User",
          previousValue: null,
          newValue: null,
          ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
          userAgent: req.headers["user-agent"] || null,
          schoolId: user.school || null,
        });
      }
    }

    // In your logout controller
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      expires: new Date(0),
      path: "/",
    });

    return sendSucess(res, "Logged out successfully", null, 200);
  } catch (error) {
    console.error("Logout error:", error);
    return sendError(res, "An error occurred during logout");
  }
};
