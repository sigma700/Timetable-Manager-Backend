/**
 * The ONLY shape of a user that may leave the server.
 *
 * Before this existed, /api/check-Auth, /api/login and /api/verify returned the
 * raw Mongoose document — including the bcrypt hash and the live verification
 * code. Every controller that responds with a user must go through this.
 *
 * `isVerified` and `school` are the two facts the frontend uses to decide
 * which experience a user belongs in (see frontend authStore.deriveStage).
 */
export const toSafeUser = (user) => {
  if (!user) return null;
  const u = typeof user.toObject === "function" ? user.toObject() : user;

  // `timetables` is declared as a String in the schema but is pushed to as an
  // array in genTimetableHandler. Normalise so the client always gets an array.
  const timetables = Array.isArray(u.timetables)
    ? u.timetables.map(String)
    : u.timetables
      ? [String(u.timetables)]
      : [];

  // `school` is an ObjectId normally, or a populated {_id, name} document when
  // the caller used .populate("school", "name").
  const populatedSchool =
    u.school && typeof u.school === "object" && u.school.name ? u.school : null;

  return {
    _id: String(u._id),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    avatar: u.avatar ?? null,
    accountType: u.accountType,
    contacts: u.contacts ?? null,
    isVerified: Boolean(u.isVerified),
    school: u.school ? String(populatedSchool?._id ?? u.school) : null,
    institutionName: populatedSchool?.name ?? null,
    timetables,
    createdAt: u.createdAt,
  };
};
