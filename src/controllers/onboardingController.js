import mongoose from "mongoose";
import {User} from "../database/model/users.js";
import {School} from "../database/model/school.js";
import {Subject} from "../database/model/subjects.js";
import {ClassData} from "../database/model/classData.js";
import {ListOfTechers} from "../database/model/teachers.js";
import {GenTable} from "../database/model/fullTable.js";
import {sendError, sendSucess} from "../../utils/sendError.js";
import {toSafeUser} from "../../utils/safeUser.js";
import {buildOnboardingPlan, summariseErrors} from "../../utils/onboardingPlan.js";
import {sendIdMail} from "../../resend/sendEmail.js";
import {trackActivity} from "../../service/activityService.js";
import {createAuditLog} from "../../service/auditService.js";



const fireAndForget = (promiseOrFn, context) => {
  Promise.resolve()
    .then(() => (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn))
    .catch((err) => console.error(`[onboarding:${context}]`, err));
};

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), {statusCode, code});

const noSchool = {$or: [{school: null}, {school: {$exists: false}}]};


const writeSetup = async (plan, userId, opts, track = {}) => {
  const [school] = await School.create([{name: plan.schoolName}], opts);
  const schoolId = school._id;
  track.schoolId = schoolId; 
  const claimed = await User.findOneAndUpdate(
    {_id: userId, ...noSchool},
    {$set: {school: schoolId}},
    {...opts, new: true},
  );
  if (!claimed) throw httpError(409, "SCHOOL_EXISTS", "Your school is already set up.");

  const subjectDocs = plan.subjects.map((name) => ({
    _id: new mongoose.Types.ObjectId(),
    name,
    school: schoolId,
  }));
  const subjectId = new Map(subjectDocs.map((s) => [s.name, s._id]));
  const allSubjectIds = subjectDocs.map((s) => s._id);

  const classDocs = plan.classes.map((c) => ({
    _id: new mongoose.Types.ObjectId(),
    name: c.name,
    type: c.type,
    level: c.level,
    label: c.label,
    school: schoolId,
    isOccupied: false,
    subjects: allSubjectIds, // same behaviour as listClassData: every class starts with every subject
  }));
  const classId = new Map(classDocs.map((c) => [c.name, c._id]));

  const teacherDocs = plan.teachers.map((t) => ({
    name: t.name,
    school: schoolId,
    subjects: t.subjects.map((s) => subjectId.get(s)),
    classes: t.classes.map((c) => classId.get(c)),
  }));

  await Subject.insertMany(subjectDocs, opts);
  if (classDocs.length) await ClassData.insertMany(classDocs, opts);
  if (teacherDocs.length) await ListOfTechers.insertMany(teacherDocs, opts);

  return {
    schoolId,
    schoolName: school.name,
    counts: {
      subjects: subjectDocs.length,
      classes: classDocs.length,
      teachers: teacherDocs.length,
    },
    teacherNames: teacherDocs.map((t) => t.name),
  };
};

// Standalone MongoDB (typical local dev) has no transactions.
const lacksTransactions = (err) =>
  err?.code === 20 ||
  /replica set|transaction numbers are only allowed/i.test(err?.message || "");

let transactionsAvailable; // undefined until the first attempt tells us

const undoPartialSetup = async (userId, schoolId) => {
  try {
    await Promise.all([
      ClassData.deleteMany({school: schoolId}),
      Subject.deleteMany({school: schoolId}),
      ListOfTechers.deleteMany({school: schoolId}),
    ]);
    await User.updateOne({_id: userId, school: schoolId}, {$unset: {school: 1}});
    await School.deleteOne({_id: schoolId});
  } catch (cleanupErr) {
    console.error("[onboarding] cleanup after failure also failed", cleanupErr);
  }
};

const persist = async (plan, userId) => {
  if (transactionsAvailable !== false) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await writeSetup(plan, userId, {session});
      });
      transactionsAvailable = true;
      return result;
    } catch (err) {
      if (!lacksTransactions(err)) throw err;
      transactionsAvailable = false;
      console.warn(
        "[onboarding] MongoDB transactions unavailable (standalone server). " +
          "Using write-then-undo instead. Run a replica set (Atlas does) for true atomicity.",
      );
    } finally {
      await session.endSession();
    }
  }

  const track = {};
  try {
    return await writeSetup(plan, userId, {}, track);
  } catch (err) {
    if (track.schoolId) await undoPartialSetup(userId, track.schoolId);
    throw err;
  }
};

const isEmptySchool = async (schoolId) => {
  const [subjects, classes, teachers, tables] = await Promise.all([
    Subject.countDocuments({school: schoolId}),
    ClassData.countDocuments({school: schoolId}),
    ListOfTechers.countDocuments({school: schoolId}),
    GenTable.countDocuments({school: schoolId}),
  ]);
  return subjects + classes + teachers + tables === 0;
};

// ── The handler ────────────────────────────────────────────────────────────

export const submitOnboarding = async (req, res) => {
  const userId = req.userId;
  try {
    // 1. Who is this?
    if (!userId) return sendError(res, "Not authenticated", 401);
    const user = await User.findById(userId).select("isVerified school");
    if (!user) return sendError(res, "User not found", 401);
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email to continue.",
      });
    }

    // 2. Is the whole submission valid? Nothing has been written yet.
    const parsed = buildOnboardingPlan(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_FAILED",
        message: summariseErrors(parsed.errors),
        errors: parsed.errors,
      });
    }

    if (user.school) {
      const leftoverId = user.school; // capture first: never re-read it after mutating
      if (!(await isEmptySchool(leftoverId))) {
        return res.status(409).json({
          success: false,
          code: "SCHOOL_EXISTS",
          message: "Your school is already set up.",
        });
      }
      await User.updateOne({_id: userId, school: leftoverId}, {$unset: {school: 1}});
      await School.deleteOne({_id: leftoverId});
    }

    // 3. Write everything or nothing.
    const result = await persist(parsed.plan, userId);

    // 4. Side effects. Never awaited, never able to fail the request.
    const {schoolId} = result;
    const meta = {
      ipAddress: req.ip || req.headers?.["x-forwarded-for"] || null,
      userAgent: req.headers?.["user-agent"] || null,
    };
    fireAndForget(() => sendIdMail(schoolId), "sendIdMail");
    fireAndForget(
      () =>
        trackActivity({
          event: "SCHOOL_CREATED",
          eventCategory: "INSTITUTION",
          userId,
          schoolId,
          metadata: {entityId: schoolId, entityName: result.schoolName},
        }),
      "activity:school",
    );
    fireAndForget(
      () =>
        createAuditLog({
          action: "SCHOOL_CREATED",
          actionCategory: "INSTITUTION",
          performedBy: userId,
          targetId: schoolId,
          targetModel: "School",
          previousValue: null,
          newValue: {name: result.schoolName, ...result.counts},
          schoolId,
          ...meta,
        }),
      "audit:school",
    );
    fireAndForget(
      () =>
        trackActivity({
          event: "SUBJECT_CREATED",
          eventCategory: "SUBJECT",
          userId,
          schoolId,
          metadata: {subjectCount: result.counts.subjects, entityNames: parsed.plan.subjects},
        }),
      "activity:subjects",
    );
    if (result.counts.classes) {
      fireAndForget(
        () =>
          trackActivity({
            event: "CLASS_CREATED",
            eventCategory: "CLASS",
            userId,
            schoolId,
            metadata: {
              entityName: parsed.plan.classes[0].type,
              classCount: result.counts.classes,
              levelRange: {
                min: parsed.plan.classes[0].level,
                max: parsed.plan.classes[parsed.plan.classes.length - 1].level,
              },
            },
          }),
        "activity:classes",
      );
    }
    for (const t of parsed.plan.teachers) {
      fireAndForget(
        () =>
          trackActivity({
            event: "TEACHER_CREATED",
            eventCategory: "TEACHER",
            userId,
            schoolId,
            metadata: {entityName: t.name, subjectCount: t.subjects.length, classCount: t.classes.length},
          }),
        "activity:teacher",
      );
    }

    // 5. Answer with the updated user, so the client moves into the product
    //    from real server state (no second round-trip, no guessing).
    const fresh = await User.findById(userId).populate("school", "name");
    return sendSucess(
      res,
      "Your school is ready!",
      {
        user: toSafeUser(fresh),
        school: {_id: String(schoolId), name: result.schoolName},
        counts: result.counts,
      },
      201,
    );
  } catch (error) {
    const status = error?.statusCode || 500;
    if (status >= 500) console.error("[onboarding]", error); // 4xx here are expected outcomes, not faults
    if (error?.code === "SCHOOL_EXISTS" || error?.code === "EMAIL_NOT_VERIFIED") {
      return res.status(status).json({success: false, code: error.code, message: error.message});
    }
    if (error?.code === 11000) {
      return sendError(res, "Some of these names already exist in your school.", 409);
    }
    return sendError(
      res,
      "We couldn't finish setting up your school, and nothing was saved. Please try again.",
      500,
    );
  }
};
