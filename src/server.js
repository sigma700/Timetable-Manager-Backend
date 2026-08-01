import express from "express";
import cors from "cors";
import "dotenv/config";
import {connectDb} from "./database/config.js";
import {router} from "./routes/userRoutes.js";
// import { lessonRouter } from './routes/lessonsRoute.js';
import {dataRouter} from "./routes/dataRouter.js";
import cookieParser from "cookie-parser";
import {demoRoute} from "./routes/demoRouter.js";
import {activityRouter} from "./routes/activityRouter.js";
import {analyticsRouter} from "./routes/analyticsRouter.js";
import {adminRouter} from "./routes/adminRouter.js";
import {auditRouter} from "./routes/auditRouter.js";

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET , POST , PUT , DELETE , PATCH"],
    credentials: true,
  }),
);

app.use(
  "/api",
  router,
  dataRouter,
  demoRoute,
  activityRouter,
  analyticsRouter,
  adminRouter,
  auditRouter,
);

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
