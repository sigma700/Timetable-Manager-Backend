import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, default: null}, // null for OAuth users
    googleId: {type: String, default: null, sparse: true},
    avatar: {type: String, default: null},
    isVerified: {type: Boolean, default: false},
    accountType: {
      type: String,
      enum: ["teacher", "admin", "school_admin"],
      default: "teacher",
    },
    school: {type: mongoose.Schema.Types.ObjectId, ref: "School"},
    contacts: {type: String},
    resetPasscodeToken: String,
    verToken: String,
    verTokenExpDate: Date,
    timetables: {type: mongoose.Schema.Types.String, ref: "Timetable"},
  },
  {timestamps: true},
);

// Sparse index on googleId — allows null values without unique constraint violations
userSchema.index({googleId: 1}, {sparse: true});

export const User = mongoose.model("User", userSchema);
