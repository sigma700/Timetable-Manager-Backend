/**
 * RUN THIS BEFORE DEPLOYING THE NEW verification gate.
 *
 * Why: the old createTeacher() set `teacher.isVerified = true` in memory but
 * never saved it, so every email/password account in your database has
 * isVerified === false. Once the backend enforces verification, all of those
 * existing users would be locked out at /verify.
 *
 * This marks every account that exists RIGHT NOW as verified (it clears any
 * stale code too). Accounts created after you deploy go through real
 * verification.
 *
 * Usage (from the backend folder, same .env as the server):
 *   node scripts/grandfather-verified.js            # dry run — prints counts only
 *   node scripts/grandfather-verified.js --apply    # performs the update
 */
import "dotenv/config";
import mongoose from "mongoose";
import {User} from "../src/database/model/users.js";

const apply = process.argv.includes("--apply");

// IMPORTANT: use the same connection string your server uses (connectDb in
// database/config.js). Adjust the env var name below if yours differs.
const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;
if (!uri) {
  console.error("No Mongo connection string found in env (MONGO_URI / MONGODB_URI / DB_URL). Edit this script.");
  process.exit(1);
}

await mongoose.connect(uri);

const cutoff = new Date();
const filter = {isVerified: {$ne: true}, createdAt: {$lte: cutoff}};
const total = await User.countDocuments({});
const pending = await User.countDocuments(filter);
const withSchool = await User.countDocuments({...filter, school: {$exists: true, $ne: null}});

console.log(`Users total:                 ${total}`);
console.log(`Unverified (to grandfather): ${pending}`);
console.log(`  …of which already have a school: ${withSchool}`);

if (!apply) {
  console.log("\nDry run only. Re-run with --apply to update.");
} else {
  const res = await User.updateMany(filter, {
    $set: {isVerified: true, verAttempts: 0},
    $unset: {verToken: "", verTokenExpDate: "", verSentAt: ""},
  });
  console.log(`\nUpdated ${res.modifiedCount} users.`);
}

await mongoose.disconnect();
