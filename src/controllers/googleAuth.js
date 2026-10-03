// import {genJwTok} from "../utils/genJwToken.js";
// import {sendError} from "../utils/sendError.js";
// import {trackActivity} from "../service/activityService.js";
// import {createAuditLog} from "../service/auditService.js";
import {randomBytes} from "node:crypto";
import {User} from "../database/model/users.js";
import {genJwTok} from "../../utils/genJwToken.js";
import {trackActivity} from "../../service/activityService.js";
import {createAuditLog} from "../../service/auditService.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g. http://localhost:4000/api/auth/google/callback
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Step 1: Redirect to Google ───────────────────────────────────────────────
export const googleRedirect = (req, res) => {
  // CSRF protection: bind this login attempt to this browser.
  const state = randomBytes(24).toString("hex");
  res.cookie("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must be sent on Google's top-level redirect back to us
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  const params = new URLSearchParams({
    state,
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// ─── Step 2: Handle callback ──────────────────────────────────────────────────
export const googleCallback = async (req, res) => {
  const {code, error, state} = req.query;

  const expectedState = req.cookies?.g_oauth_state;
  res.clearCookie("g_oauth_state", {path: "/"});
  if (!state || !expectedState || state !== expectedState) {
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
  }

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_denied`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Google OAuth] Token exchange failed:", tokenData);
      return res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    // Fetch Google user profile
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {Authorization: `Bearer ${tokenData.access_token}`},
      },
    );

    const profile = await profileRes.json();

    if (!profile.email) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }
    // Only trust the address if Google says the person has proven they own it.
    // Without this, an unverified Google-side address could be linked to (or
    // used to take over) an existing Protiba account with the same email.
    if (profile.email_verified !== true) {
      return res.redirect(`${FRONTEND_URL}/login?error=email_not_verified`);
    }
    const googleEmail = String(profile.email).trim().toLowerCase();

    // Upsert user — find by googleId first, then by email
    let user = await User.findOne({
      $or: [{googleId: profile.sub}, {email: googleEmail}],
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user from Google profile
      user = await User.create({
        firstName: profile.given_name || profile.name?.split(" ")[0] || "User",
        lastName:
          profile.family_name ||
          profile.name?.split(" ").slice(1).join(" ") ||
          "",
        email: googleEmail,
        googleId: profile.sub,
        avatar: profile.picture || null,
        isVerified: true, // Google emails are pre-verified
        password: null, // No password for OAuth users
        accountType: "teacher",
      });
    } else if (!user.googleId) {
      // Existing email user — link Google account
      user.googleId = profile.sub;
      // If the existing account was never verified, whoever registered it never
      // proved they own this address (pre-hijack attack). Google has now proven
      // the real owner, so drop the unproven password.
      if (!user.isVerified) user.password = null;
      user.isVerified = true;
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      await user.save();
    }

    // Issue JWT cookie — same as email/password login
    genJwTok(res, user._id);

    // Track activity
    trackActivity({
      event: isNewUser ? "USER_REGISTERED" : "USER_LOGGED_IN",
      eventCategory: "AUTH",
      userId: user._id,
      schoolId: user.school || null,
      metadata: {
        entityId: user._id,
        entityName: `${user.firstName} ${user.lastName}`,
        entityEmail: user.email,
        provider: "google",
      },
    });

    createAuditLog({
      action: isNewUser ? "USER_REGISTER" : "USER_LOGIN",
      actionCategory: "AUTH",
      performedBy: user._id,
      targetId: user._id,
      targetModel: "User",
      previousValue: null,
      newValue: {email: user.email, provider: "google"},
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: user.school || null,
    });

    // Redirect to frontend home
    // /app is the Gate: it routes the user to /verify, /onboarding or the product.
    res.redirect(`${FRONTEND_URL}/app`);
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
};
