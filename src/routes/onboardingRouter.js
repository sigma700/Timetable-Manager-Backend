import {Router} from "express";
import {submitOnboarding} from "../controllers/onboardingController.js";
import {verifyToken} from "../../middleware/checkToken.js";

const onboardingRouter = Router();

onboardingRouter.post("/onboarding", verifyToken, submitOnboarding);

export {onboardingRouter};
