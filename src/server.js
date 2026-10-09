import express from "express";
import cors from "cors";
import "dotenv/config";
import {connectDb} from "./database/config.js";
import {router} from "./routes/userRoutes.js";
import {dataRouter} from "./routes/dataRouter.js";
import cookieParser from "cookie-parser";
import {demoRoute} from "./routes/demoRouter.js";
import {activityRouter} from "./routes/activityRouter.js";
import {analyticsRouter} from "./routes/analyticsRouter.js";
import {adminRouter} from "./routes/adminRouter.js";
import {auditRouter} from "./routes/auditRouter.js";
import {settingsRouter} from "./routes/settingsRouter.js";
import { onboardingRouter } from "./routes/onboardingRouter.js";

const app = express();
const port = process.env.PORT;

const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTED_URL,
]
  .filter((value) => value?.trim())
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => new URL(value).origin);
const defaultFrontendOrigins = ["https://protiba.onrender.com"];
if (process.env.NODE_ENV !== "production") {
  defaultFrontendOrigins.push("http://localhost:5173");
}
const allowedOrigins = [
  ...new Set([...defaultFrontendOrigins, ...configuredFrontendOrigins]),
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api", router, dataRouter, demoRoute, activityRouter, analyticsRouter, adminRouter, auditRouter, settingsRouter , onboardingRouter);

connectDb();

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Here is the basic route for overall testing!",
  });
});

app.listen(port, () => {
  console.log(`Server is listening on : http://localhost:${port}`);
});