//lets create an endpoint to handle input of all the teachers in the school

import {ClassData} from "../database/model/classData.js";
import {GenTable} from "../database/model/fullTable.js";
import {School} from "../database/model/school.js";
import {Subject} from "../database/model/subjects.js";
import {ListOfTechers} from "../database/model/teachers.js";

import {generateSimpleTimetable} from "../../service/genTable.js";
import {sendError, sendSucess} from "../../utils/sendError.js";
import {User} from "../database/model/users.js";
import {sendIdMail} from "../../resend/sendEmail.js";
import {trackActivity} from "../../service/activityService.js";
import {createAuditLog} from "../../service/auditService.js";
import calculateTime from "../../utils/calculateTime.js";
import mongoose from "mongoose";

function fireAndForget(promise, context) {
  Promise.resolve(promise).catch((err) => {
    console.error(`[fire-and-forget:${context}]`, err);
  });
}

async function getUserSchoolId(userId) {
  const user = await User.findById(userId).populate("school");
  if (!user) {
    throw Object.assign(new Error("User not found"), {statusCode: 404});
  }
  if (!user.school) {
    throw Object.assign(new Error("User is not associated with any school"), {
      statusCode: 400,
    });
  }
  return user.school._id;
}

function sendCaughtError(res, error, fallbackMessage = "Something went wrong") {
  sendError(res, error?.message || fallbackMessage, error?.statusCode || 500);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function calculatePeriodTimes(schedule, config = {}) {
  const startTime = config.startTime ?? "08:00";
  const periodDuration = config.periodDuration ?? 45;

  return schedule.map((day) => ({
    ...day,
    periods: day.periods.map((period) => {
      if (!period || period.isBreak || period.periodNumber == null) {
        return period;
      }
      const slot = period.periodNumber - 1;
      const mult = period.isDoublePeriod ? 2 : 1;
      return {
        ...period,
        startTime: calculateTime(startTime, slot * periodDuration),
        endTime: calculateTime(startTime, (slot + mult) * periodDuration),
      };
    }),
  }));
}

const MAX_LEVEL_RANGE = 50;
const MAX_LABELS = 20;

const UPDATABLE_TIMETABLE_FIELDS = new Set(["name", "config", "timetables"]);

// ── Handlers ─────────────────────────────────────────────────────────────────

export const listSchool = async (req, res) => {
  try {
    const {name} = req.body;
    const userId = req.userId;

    if (!name || typeof name !== "string" || !name.trim()) {
      return sendError(res, "School name is required", 400);
    }

    const createdSchool = await School.create({name: name.trim()});

    if (userId) {
      await User.findByIdAndUpdate(
        userId,
        {school: createdSchool._id},
        {new: true},
      );
    }

    const schoolId = createdSchool._id;

    await sendIdMail(schoolId);

    fireAndForget(
      trackActivity({
        event: "SCHOOL_CREATED",
        eventCategory: "INSTITUTION",
        userId,
        schoolId,
        metadata: {
          entityId: createdSchool._id,
          entityName: createdSchool.name,
        },
      }),
      "trackActivity:SCHOOL_CREATED",
    );

    fireAndForget(
      createAuditLog({
        action: "SCHOOL_CREATED",
        actionCategory: "INSTITUTION",
        performedBy: userId,
        targetId: createdSchool._id,
        targetModel: "School",
        previousValue: null,
        newValue: {name: createdSchool.name},
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:SCHOOL_CREATED",
    );

    return sendSucess(res, "School created successfully!", {
      school: createdSchool,
      userId: userId || null,
    });
  } catch (error) {
    sendCaughtError(res, error);
  }
};

export const listSubjects = async (req, res) => {
  try {
    const userId = req.userId;
    const schoolId = await getUserSchoolId(userId);
    const {names} = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return sendError(res, "Missing or invalid subject data", 400);
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const newSubjects = names
      .filter((name) => typeof name === "string" && name.trim())
      .map((name) => ({
        name: name.trim(),
        school: schoolObjectId,
      }));

    if (newSubjects.length === 0) {
      return sendError(res, "No valid subject names provided", 400);
    }

    const createdSubjects = await Subject.insertMany(newSubjects);

    fireAndForget(
      trackActivity({
        event: "SUBJECT_CREATED",
        eventCategory: "SUBJECT",
        userId,
        schoolId,
        metadata: {
          subjectCount: createdSubjects.length,
          entityNames: createdSubjects.map((s) => s.name),
        },
      }),
      "trackActivity:SUBJECT_CREATED",
    );

    return sendSucess(
      res,
      `Created ${createdSubjects.length} subject(s)!`,
      createdSubjects,
      201,
    );
  } catch (error) {
    console.error(error.message);

    if (error.code === 11000) {
      return sendError(res, "Some subjects already exist in this school", 400);
    }

    sendCaughtError(res, error);
  }
};

export const listClassData = async (req, res) => {
  try {
    const userId = req.userId;
    const schoolId = await getUserSchoolId(userId);
    const {type, minLevel, maxLevel, labels} = req.body;

    if (
      !type ||
      minLevel === undefined ||
      maxLevel === undefined ||
      !labels?.length
    ) {
      return sendError(res, "Missing required fields", 400);
    }

    const validTypes = ["Class", "Grade", "Form"];
    if (!validTypes.includes(type)) {
      return sendError(
        res,
        `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        400,
      );
    }

    const min = parseInt(minLevel);
    const max = parseInt(maxLevel);

    if (isNaN(min) || isNaN(max) || min > max) {
      return sendError(res, "Invalid level range", 400);
    }

    if (max - min > MAX_LEVEL_RANGE) {
      return sendError(
        res,
        `Level range too large — max ${MAX_LEVEL_RANGE} levels per request`,
        400,
      );
    }
    if (labels.length > MAX_LABELS) {
      return sendError(res, `Too many labels — max ${MAX_LABELS}`, 400);
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const allSubjects = await Subject.find({school: schoolObjectId});
    const subjectIds = allSubjects.map((subject) => subject._id);

    const classes = [];
    for (let level = min; level <= max; level++) {
      for (const label of labels.map((l) => String(l).toUpperCase())) {
        classes.push({
          name: `${type.trim()} ${level}${label}`,
          type: type.trim(),
          level,
          label,
          school: schoolObjectId,
          isOccupied: false,
          subjects: subjectIds,
        });
      }
    }

    const createdClasses = await ClassData.insertMany(classes);

    fireAndForget(
      trackActivity({
        event: "CLASS_CREATED",
        eventCategory: "CLASS",
        userId,
        schoolId,
        metadata: {
          entityName: type,
          classCount: createdClasses.length,
          levelRange: {min, max},
          labels,
        },
      }),
      "trackActivity:CLASS_CREATED",
    );

    return sendSucess(
      res,
      `${createdClasses.length} classes created`,
      createdClasses,
      201,
    );
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return sendError(res, "Some of these classes already exist", 400);
    }
    sendCaughtError(res, error);
  }
};

export const listTeachers = async (req, res) => {
  try {
    const userId = req.userId;
    const schoolId = await getUserSchoolId(userId);
    const {name, subjects, classesNames} = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim() ||
      !Array.isArray(subjects) ||
      subjects.length === 0 ||
      !Array.isArray(classesNames)
    ) {
      return sendError(res, "Missing or invalid teacher data", 400);
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
    const trimmedName = name.trim();

    const existing = await ListOfTechers.findOne({
      name: {$regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, "i")},
      school: schoolObjectId,
    });

    if (existing) {
      return sendError(res, "Teacher already exists in this school!", 400);
    }

    const subjNames = await Subject.find({
      name: {$in: subjects},
      school: schoolObjectId,
    });

    if (subjNames.length !== subjects.length) {
      const foundSubjectNames = subjNames.map((s) => s.name);
      const missingSubjects = subjects.filter(
        (n) => !foundSubjectNames.includes(n),
      );
      return sendError(
        res,
        `These subjects don't exist: ${missingSubjects.join(", ")}`,
        400,
      );
    }

    const subjIds = subjNames.map((s) => s._id);

    const classes = await ClassData.find({
      name: {$in: classesNames},
      school: schoolObjectId,
    });

    if (classes.length !== classesNames.length) {
      const foundClassNames = classes.map((c) => c.name);
      const missingClasses = classesNames.filter(
        (name) => !foundClassNames.includes(name),
      );
      return sendError(
        res,
        `These classes don't exist: ${missingClasses.join(", ")}`,
        400,
      );
    }

    const classIds = classes.map((c) => c._id);

    const createdTeacher = await ListOfTechers.create({
      name: trimmedName,
      classes: classIds,
      school: schoolObjectId,
      subjects: subjIds,
    });

    fireAndForget(
      trackActivity({
        event: "TEACHER_CREATED",
        eventCategory: "TEACHER",
        userId,
        schoolId,
        metadata: {
          entityId: createdTeacher._id,
          entityName: createdTeacher.name,
          subjectCount: subjIds.length,
          classCount: classIds.length,
        },
      }),
      "trackActivity:TEACHER_CREATED",
    );

    fireAndForget(
      createAuditLog({
        action: "TEACHER_CREATED",
        actionCategory: "TEACHER",
        performedBy: userId,
        targetId: createdTeacher._id,
        targetModel: "Teacher",
        previousValue: null,
        newValue: {
          name: createdTeacher.name,
          subjectCount: subjIds.length,
          classCount: classIds.length,
        },
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:TEACHER_CREATED",
    );

    return sendSucess(
      res,
      "Successfully created teacher!",
      createdTeacher,
      201,
    );
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return sendError(res, "Teacher with this name already exists", 400);
    }
    sendCaughtError(res, error);
  }
};

export const genTimetableHandler = async (req, res) => {
  try {
    const {name, config} = req.body;
    const userId = req.userId;
    const generationStartTime = Date.now();

    if (!name) {
      return sendError(res, "Name value is required!", 400);
    }
    if (!userId) {
      return sendError(res, "User not authenticated!", 401);
    }

    const schoolId = await getUserSchoolId(userId);

    const safeConfig = config && typeof config === "object" ? config : {};

    const timetables = await generateSimpleTimetable(schoolId, safeConfig);

    const timetable = await GenTable.create({
      name,
      school: schoolId,
      timetables,
      config: safeConfig,
      constraints: {},
      createdBy: userId,
    });

    await User.findByIdAndUpdate(
      userId,
      {$push: {timetables: timetable._id}},
      {new: true},
    );

    const generationDurationMs = Date.now() - generationStartTime;
    const generatedLessons = timetables.reduce((total, t) => {
      return (
        total +
        t.schedule.reduce((dayTotal, day) => {
          return dayTotal + day.periods.filter((p) => !p?.isBreak).length;
        }, 0)
      );
    }, 0);

    const [totalTeachers, totalSubjects] = await Promise.all([
      ListOfTechers.countDocuments({school: schoolId}),
      Subject.countDocuments({school: schoolId}),
    ]);

    fireAndForget(
      trackActivity({
        event: "TIMETABLE_GENERATED",
        eventCategory: "TIMETABLE",
        userId,
        schoolId,
        metadata: {
          entityId: timetable._id,
          entityName: timetable.name,
          totalClasses: timetables.length,
          totalTeachers,
          totalSubjects,
          generatedLessons,
          periodsPerDay: safeConfig?.periodsPerDay,
          generationDurationMs,
        },
      }),
      "trackActivity:TIMETABLE_GENERATED",
    );

    fireAndForget(
      createAuditLog({
        action: "TIMETABLE_GENERATED",
        actionCategory: "TIMETABLE",
        performedBy: userId,
        targetId: timetable._id,
        targetModel: "Timetable",
        previousValue: null,
        newValue: {
          name: timetable.name,
          totalClasses: timetables.length,
          generatedLessons,
          generationDurationMs,
        },
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:TIMETABLE_GENERATED",
    );

    return sendSucess(
      res,
      "Timetable generated and saved to the database!",
      timetable,
      201,
    );
  } catch (error) {
    console.error("Timetable generation error:", error);
    // The original sent a response here AND then called sendError()
    // below with the same error — a guaranteed "Cannot set headers
    // after they are sent" crash on every single failure path. Only one
    // response is sent now.
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      errorDetails:
        process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export const updateTimetable = async (req, res) => {
  try {
    const {timetableId} = req.params;
    const userId = req.userId;
    const updateData = req.body;

    if (!timetableId || !updateData || typeof updateData !== "object") {
      return sendError(res, "Missing timetable ID or update data", 400);
    }

    const schoolId = await getUserSchoolId(userId);

    const timetable = await GenTable.findOne({
      _id: timetableId,
      school: schoolId,
    });
    if (!timetable) {
      return sendError(
        res,
        "Timetable not found or you do not have access to it",
        404,
      );
    }

    const isConfigUpdate =
      updateData.config &&
      (updateData.config.periodDuration !== timetable.config?.periodDuration ||
        updateData.config.startTime !== timetable.config?.startTime ||
        JSON.stringify(updateData.config.breaks) !==
          JSON.stringify(timetable.config?.breaks));

    const previousValue = {
      name: timetable.name,
      config: timetable.config,
    };

    for (const key of Object.keys(updateData)) {
      if (UPDATABLE_TIMETABLE_FIELDS.has(key)) {
        timetable[key] = updateData[key];
      }
    }

    if (updateData.updateNestedConfigs && updateData.config) {
      timetable.timetables.forEach((nestedTimetable) => {
        nestedTimetable.config = {
          ...nestedTimetable.config,
          ...updateData.config,
        };
      });
    }

    if (isConfigUpdate) {
      timetable.timetables.forEach((nestedTimetable) => {
        nestedTimetable.schedule = calculatePeriodTimes(
          nestedTimetable.schedule,
          nestedTimetable.config,
        );
      });
    }

    await timetable.save();

    fireAndForget(
      trackActivity({
        event: "TIMETABLE_UPDATED",
        eventCategory: "TIMETABLE",
        userId,
        schoolId,
        metadata: {
          entityId: timetableId,
          entityName: timetable.name,
          configChanged: isConfigUpdate,
        },
      }),
      "trackActivity:TIMETABLE_UPDATED",
    );

    fireAndForget(
      createAuditLog({
        action: "TIMETABLE_UPDATED",
        actionCategory: "TIMETABLE",
        performedBy: userId,
        targetId: timetableId,
        targetModel: "Timetable",
        previousValue,
        newValue: {
          name: timetable.name,
          config: timetable.config,
          configChanged: isConfigUpdate,
        },
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:TIMETABLE_UPDATED",
    );

    return sendSucess(res, "Timetable updated successfully!", timetable, 200);
  } catch (error) {
    console.error(error);
    sendCaughtError(res, error);
  }
};

export const updateTimetableSlot = async (req, res) => {
  try {
    const {timetableId} = req.params;
    const userId = req.userId;

    const {
      classIndex,
      dayIndex,
      periodIndex,
      subject = null,
      teacher = null,
    } = req.body;

    if (
      typeof classIndex !== "number" ||
      typeof dayIndex !== "number" ||
      typeof periodIndex !== "number"
    ) {
      return sendError(
        res,
        "classIndex, dayIndex, and periodIndex are required numbers",
        400,
      );
    }

    const schoolId = await getUserSchoolId(userId);

    // Ownership enforced in the query — a timetable from another school
    // 404s instead of being editable by anyone who knows/guesses its ID.
    const timetable = await GenTable.findOne({
      _id: timetableId,
      school: schoolId,
    }).lean();

    if (!timetable) {
      return sendError(
        res,
        "Timetable not found or you do not have access to it",
        404,
      );
    }

    const targetClass = timetable.timetables?.[classIndex];
    if (!targetClass) {
      return sendError(res, `No classroom at index ${classIndex}`, 400);
    }

    const targetDay = targetClass.schedule?.[dayIndex];
    if (!targetDay) {
      return sendError(res, `No day at index ${dayIndex}`, 400);
    }

    const targetPeriod = targetDay.periods?.[periodIndex];
    if (!targetPeriod) {
      return sendError(res, `No period at index ${periodIndex}`, 400);
    }

    if (teacher?._id) {
      const teacherId = teacher._id.toString();

      const conflict = timetable.timetables.find((cls, ci) => {
        if (ci === classIndex) return false;

        const period = cls.schedule?.[dayIndex]?.periods?.[periodIndex];
        return period?.teacher?._id?.toString() === teacherId;
      });

      if (conflict) {
        return sendError(
          res,
          `${teacher.name} is already assigned to ${conflict.name} at this day and period`,
          409,
        );
      }
    }

    const previousValue = {
      subject: targetPeriod.subject ?? null,
      teacher: targetPeriod.teacher ?? null,
      warning: targetPeriod.warning ?? null,
    };

    const resolvedSubject = subject ?? null;
    const resolvedTeacher = teacher ?? null;

    const warning =
      resolvedSubject && !resolvedTeacher
        ? `No available teacher for ${resolvedSubject.name}`
        : null;

    const slotPath = "timetables.$[cls].schedule.$[day].periods.$[period]";

    const updatedTimetable = await GenTable.findOneAndUpdate(
      {_id: timetableId, school: schoolId},
      {
        $set: {
          [`${slotPath}.subject`]: resolvedSubject,
          [`${slotPath}.teacher`]: resolvedTeacher,
          [`${slotPath}.warning`]: warning,
        },
      },
      {
        arrayFilters: [
          {"cls.name": targetClass.name},
          {"day.day": targetDay.day},
          {"period.periodNumber": targetPeriod.periodNumber},
        ],
        new: true,
        runValidators: false,
      },
    ).lean();

    if (!updatedTimetable) {
      return sendError(
        res,
        "Update failed — timetable not found after write",
        500,
      );
    }

    const updatedSlot =
      updatedTimetable.timetables?.[classIndex]?.schedule?.[dayIndex]
        ?.periods?.[periodIndex] ?? null;

    fireAndForget(
      trackActivity({
        event: "TIMETABLE_UPDATED",
        eventCategory: "TIMETABLE",
        userId,
        schoolId,
        metadata: {
          entityId: timetableId,
          entityName: timetable.name,
          classIndex,
          dayIndex,
          periodIndex,
          configChanged: false,
        },
      }),
      "trackActivity:TIMETABLE_SLOT_UPDATED",
    );

    fireAndForget(
      createAuditLog({
        action: "TIMETABLE_UPDATED",
        actionCategory: "TIMETABLE",
        performedBy: userId,
        targetId: timetableId,
        targetModel: "Timetable",
        previousValue,
        newValue: {
          subject: resolvedSubject,
          teacher: resolvedTeacher,
          warning,
        },
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:TIMETABLE_SLOT_UPDATED",
    );

    return sendSucess(
      res,
      "Slot updated successfully",
      {
        slot: updatedSlot,
        classIndex,
        dayIndex,
        periodIndex,
        timetableId,
      },
      200,
    );
  } catch (error) {
    console.error("[updateTimetableSlot]", error);
    sendCaughtError(res, error);
  }
};

export const deleteTable = async (req, res) => {
  try {
    const {timetableId} = req.params;
    const userId = req.userId;

    const schoolId = await getUserSchoolId(userId);

    const deletedTimetable = await GenTable.findOneAndDelete({
      _id: timetableId,
      school: schoolId,
    });

    if (!deletedTimetable) {
      return sendError(
        res,
        "Timetable not found or you do not have access to it",
        404,
      );
    }

    fireAndForget(
      trackActivity({
        event: "TIMETABLE_DELETED",
        eventCategory: "TIMETABLE",
        userId,
        schoolId,
        metadata: {
          entityId: deletedTimetable._id,
          entityName: deletedTimetable.name,
        },
      }),
      "trackActivity:TIMETABLE_DELETED",
    );

    fireAndForget(
      createAuditLog({
        action: "TIMETABLE_DELETED",
        actionCategory: "TIMETABLE",
        performedBy: userId,
        targetId: deletedTimetable._id,
        targetModel: "Timetable",
        previousValue: {
          name: deletedTimetable.name,
          school: deletedTimetable.school,
        },
        newValue: null,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"] || null,
        schoolId,
      }),
      "createAuditLog:TIMETABLE_DELETED",
    );

    return sendSucess(res, "Deleted the timetable", deletedTimetable, 200);
  } catch (error) {
    sendCaughtError(res, error);
  }
};

export const getTimetable = async (req, res) => {
  const {timetableId} = req.params;
  try {
    const schoolId = await getUserSchoolId(req.userId);

    const timetable = await GenTable.findOne({
      _id: timetableId,
      $or: [{createdBy: req.userId}, {school: schoolId}],
    });

    if (!timetable) {
      return sendError(res, "No timetables found!", 404);
    }

    return sendSucess(res, "Here is the timetable", timetable, 200);
  } catch (error) {
    console.error(error);
    sendCaughtError(res, error);
  }
};
