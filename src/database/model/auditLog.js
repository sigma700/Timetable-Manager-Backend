import mongoose, {Schema} from "mongoose";

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        // AUTH
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_REGISTER",
        "USER_PASSWORD_RESET",
        "USER_EMAIL_VERIFIED",
        "USER_ROLE_CHANGED",
        // INSTITUTION
        "SCHOOL_CREATED",
        "SCHOOL_UPDATED",
        "SCHOOL_DELETED",
        // TEACHER
        "TEACHER_CREATED",
        "TEACHER_UPDATED",
        "TEACHER_DELETED",
        // TIMETABLE
        "TIMETABLE_GENERATED",
        "TIMETABLE_UPDATED",
        "TIMETABLE_DELETED",
        "TIMETABLE_EXPORTED",
        // ADMIN
        "ADMIN_VIEWED_PLATFORM",
        "ADMIN_VIEWED_SCHOOL",
        "ADMIN_VIEWED_USERS",
      ],
    },
    actionCategory: {
      type: String,
      required: true,
      enum: ["AUTH", "INSTITUTION", "TEACHER", "TIMETABLE", "ADMIN"],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      enum: ["User", "School", "Teacher", "Timetable", null],
      default: null,
    },
    previousValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // createdAt managed manually — audit logs are immutable
  },
);

// Per-user audit trail
auditLogSchema.index({performedBy: 1, createdAt: -1});

// School-scoped audit feed
auditLogSchema.index({schoolId: 1, createdAt: -1});

// Filter by action type
auditLogSchema.index({action: 1, createdAt: -1});

// Filter by category
auditLogSchema.index({actionCategory: 1, createdAt: -1});

// Find all actions on a specific entity
auditLogSchema.index({targetId: 1});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
