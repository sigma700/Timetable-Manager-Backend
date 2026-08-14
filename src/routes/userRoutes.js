import {Router} from "express";
import {
  createTeacher,
  login,
  logout,
  veriAcc,
} from "../controllers/userController.js";
import {googleRedirect, googleCallback} from "../controllers/googleAuth.js";
import {checkAuth} from "../controllers/middlewareController.js";
import {verifyToken} from "../../middleware/checkToken.js";

export const router = Router();

// ─── Email / Password ─────────────────────────────────────────────────────────
router.post("/create-account", createTeacher);
router.post("/login/:school", login);
router.post("/verify", veriAcc);
router.post("/logout", verifyToken, logout);
router.get("/check-Auth", verifyToken, checkAuth);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get("/auth/google", googleRedirect);
router.get("/auth/google/callback", googleCallback);
