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
    // Verification hardening (new)
    verAttempts: {type: Number, default: 0}, // wrong guesses against the current code
    verSentAt: Date, // when the current code was issued (resend cooldown)
    timetables: {type: mongoose.Schema.Types.String, ref: "Timetable"},
  },
  {
    timestamps: true,
    // Safety net: even if a controller forgets toSafeUser(), secrets never
    // reach the wire through res.json(userDoc).
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.verToken;
        delete ret.verTokenExpDate;
        delete ret.verAttempts;
        delete ret.verSentAt;
        delete ret.resetPasscodeToken;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Sparse index on googleId — allows null values without unique constraint violations
userSchema.index({googleId: 1}, {sparse: true});

export const User = mongoose.model("User", userSchema);
