import mongoose, {Schema} from "mongoose";

const activityLogSchema = new Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        // AUTH
        "USER_REGISTERED",
        "USER_LOGGED_IN",
        "USER_EMAIL_VERIFIED",
        "USER_PASSWORD_RESET",
        // INSTITUTION
        "SCHOOL_CREATED",
        // TEACHER
        "TEACHER_CREATED",
        "TEACHER_UPDATED",
        "TEACHER_DELETED",
        // SUBJECT
        "SUBJECT_CREATED",
        "SUBJECT_UPDATED",
        "SUBJECT_DELETED",
        // CLASS
        "CLASS_CREATED",
        "CLASS_UPDATED",
        "CLASS_DELETED",
        // TIMETABLE
        "TIMETABLE_GENERATED",
        "TIMETABLE_UPDATED",
        "TIMETABLE_DELETED",
        "TIMETABLE_EXPORTED",
      ],
    },
    eventCategory: {
      type: String,
      required: true,
      enum: ["AUTH", "INSTITUTION", "TEACHER", "SUBJECT", "CLASS", "TIMETABLE"],
    },
    source: {
      type: String,
      required: true,
      enum: ["WEB_APP", "API", "SYSTEM", "ADMIN"],
      default: "WEB_APP",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: false,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // createdAt is managed manually — logs are immutable
  },
);

// Primary query — dashboard feed scoped to school, most recent first
activityLogSchema.index({schoolId: 1, createdAt: -1});

// Per-user activity history
activityLogSchema.index({userId: 1, createdAt: -1});

// Filter feed by event type within a school
activityLogSchema.index({event: 1, schoolId: 1});

// Filter feed by category within a school
activityLogSchema.index({eventCategory: 1, schoolId: 1});

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
