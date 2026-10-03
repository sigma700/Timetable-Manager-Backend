/**
 * Validates and normalises the school-setup payload BEFORE anything is written.
 *
 * Pure function: no database, no side effects. Everything the old four-call
 * wizard only discovered halfway through (a teacher pointing at a class that was
 * never generated, a missing stream label, a misspelt subject) is caught here, so
 * a bad submission changes nothing.
 *
 * Input shape (all names are plain strings; the server never trusts the client's
 * splitting or casing):
 *   {
 *     school:   {name},
 *     subjects: ["Mathematics", "English"],
 *     classes:  {type: "Grade"|"Class"|"Form", minLevel, maxLevel, labels: ["A","B"]},
 *     teachers: [{name, subjects: [...], classes: ["Grade 5A", ...]}]
 *   }
 */

export const LIMITS = Object.freeze({
  MAX_LEVEL_RANGE: 50, // same as listClassData
  MAX_LABELS: 20, // same as listClassData
  MAX_LEVEL: 99,
  MAX_SUBJECTS: 100,
  MAX_TEACHERS: 500,
  MAX_NAME_LENGTH: 120,
  MAX_LABEL_LENGTH: 10,
});

export const CLASS_TYPES = Object.freeze(["Class", "Grade", "Form"]);

const clean = (value) => String(value).trim().replace(/\s+/g, " ");
const keyOf = (value) => clean(value).toLowerCase();

const toInt = (value) => {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

export const buildOnboardingPlan = (input) => {
  const errors = [];
  const fail = (field, message) => errors.push({field, message});
  const body = input && typeof input === "object" ? input : {};

  // ── School ──────────────────────────────────────────────────────────────
  let schoolName = "";
  if (typeof body.school?.name !== "string" || !clean(body.school.name)) {
    fail("school.name", "Please enter your school's name.");
  } else {
    schoolName = clean(body.school.name);
    if (schoolName.length > LIMITS.MAX_NAME_LENGTH) {
      fail("school.name", `The school name must be ${LIMITS.MAX_NAME_LENGTH} characters or fewer.`);
    }
  }

  // ── Subjects ────────────────────────────────────────────────────────────
  const subjects = []; // canonical display names, first spelling wins
  const subjectByKey = new Map();
  if (!Array.isArray(body.subjects)) {
    fail("subjects", "Please add at least one subject.");
  } else {
    for (const raw of body.subjects) {
      if (typeof raw !== "string" || !clean(raw)) continue;
      const name = clean(raw);
      if (name.length > LIMITS.MAX_NAME_LENGTH) {
        fail("subjects", `"${name.slice(0, 30)}…" is too long for a subject name.`);
        continue;
      }
      if (!subjectByKey.has(keyOf(name))) {
        subjectByKey.set(keyOf(name), name);
        subjects.push(name);
      }
    }
    if (subjects.length === 0) fail("subjects", "Please add at least one subject.");
    if (subjects.length > LIMITS.MAX_SUBJECTS) {
      fail("subjects", `A school can start with at most ${LIMITS.MAX_SUBJECTS} subjects. You can add more later.`);
    }
  }

  // ── Classes (generated from a level range × stream labels) ──────────────
  const classes = [];
  const classByKey = new Map();
  const c = body.classes && typeof body.classes === "object" ? body.classes : {};

  const type = typeof c.type === "string" ? c.type.trim() : "";
  if (!CLASS_TYPES.includes(type)) {
    fail("classes.type", `Please choose how classes are named: ${CLASS_TYPES.join(", ")}.`);
  }

  const min = toInt(c.minLevel);
  const max = toInt(c.maxLevel);
  let rangeOk = true;
  if (Number.isNaN(min) || Number.isNaN(max)) {
    fail("classes.levels", "Please enter the lowest and highest level as whole numbers.");
    rangeOk = false;
  } else if (min < 0 || max > LIMITS.MAX_LEVEL) {
    fail("classes.levels", `Levels must be between 0 and ${LIMITS.MAX_LEVEL}.`);
    rangeOk = false;
  } else if (min > max) {
    fail("classes.levels", "The lowest level cannot be higher than the highest level.");
    rangeOk = false;
  } else if (max - min > LIMITS.MAX_LEVEL_RANGE) {
    fail("classes.levels", `Please keep the level range within ${LIMITS.MAX_LEVEL_RANGE} levels.`);
    rangeOk = false;
  }

  const labels = [];
  if (!Array.isArray(c.labels)) {
    fail("classes.labels", "Please add at least one stream label, for example A or B.");
  } else {
    for (const raw of c.labels) {
      if (raw === null || raw === undefined || !clean(raw)) continue;
      const label = clean(raw).toUpperCase();
      if (label.length > LIMITS.MAX_LABEL_LENGTH) {
        fail("classes.labels", `Stream label "${label.slice(0, 12)}…" is too long.`);
        continue;
      }
      if (!labels.includes(label)) labels.push(label);
    }
    // The Class model requires a non-empty `label`, so a school with no streams
    // cannot be stored yet. Say so up front instead of failing halfway.
    if (labels.length === 0) fail("classes.labels", "Please add at least one stream label, for example A or B.");
    if (labels.length > LIMITS.MAX_LABELS) {
      fail("classes.labels", `Please use at most ${LIMITS.MAX_LABELS} stream labels.`);
    }
  }

  if (CLASS_TYPES.includes(type) && rangeOk && labels.length > 0 && labels.length <= LIMITS.MAX_LABELS) {
    for (let level = min; level <= max; level++) {
      for (const label of labels) {
        const name = `${type} ${level}${label}`;
        classByKey.set(keyOf(name), name);
        classes.push({name, type, level, label});
      }
    }
  }

  // ── Teachers ────────────────────────────────────────────────────────────
  const teachers = [];
  const seenTeachers = new Set();
  const rawTeachers = body.teachers === undefined ? [] : body.teachers;
  if (!Array.isArray(rawTeachers)) {
    fail("teachers", "The teacher list could not be read.");
  } else if (rawTeachers.length > LIMITS.MAX_TEACHERS) {
    fail("teachers", `You can add up to ${LIMITS.MAX_TEACHERS} teachers during setup. More can be added later.`);
  } else {
    rawTeachers.forEach((t, i) => {
      const where = `teachers[${i}]`;
      if (!t || typeof t.name !== "string" || !clean(t.name)) {
        fail(where, `Teacher ${i + 1} needs a name.`);
        return;
      }
      const name = clean(t.name);
      if (name.length > LIMITS.MAX_NAME_LENGTH) {
        fail(where, `The name "${name.slice(0, 30)}…" is too long.`);
        return;
      }
      if (seenTeachers.has(keyOf(name))) {
        fail(where, `${name} is listed more than once.`);
        return;
      }
      seenTeachers.add(keyOf(name));

      // Subjects: at least one, each must exist in THIS submission.
      const teacherSubjects = [];
      const rawSubs = Array.isArray(t.subjects) ? t.subjects : [];
      const unknownSubjects = [];
      for (const s of rawSubs) {
        if (typeof s !== "string" || !clean(s)) continue;
        const canonical = subjectByKey.get(keyOf(s));
        if (!canonical) unknownSubjects.push(clean(s));
        else if (!teacherSubjects.includes(canonical)) teacherSubjects.push(canonical);
      }
      if (unknownSubjects.length) {
        fail(where, `${name} teaches ${unknownSubjects.join(", ")}, which is not in your subject list.`);
      } else if (teacherSubjects.length === 0) {
        fail(where, `${name} needs at least one subject.`);
      }

      // Classes: optional, but each must be one the level range will generate.
      const teacherClasses = [];
      const rawClasses = Array.isArray(t.classes) ? t.classes : [];
      const unknownClasses = [];
      for (const cl of rawClasses) {
        if (typeof cl !== "string" || !clean(cl)) continue;
        const canonical = classByKey.get(keyOf(cl));
        if (!canonical) unknownClasses.push(clean(cl));
        else if (!teacherClasses.includes(canonical)) teacherClasses.push(canonical);
      }
      if (unknownClasses.length && classes.length > 0) {
        fail(where, `${name} is assigned to ${unknownClasses.join(", ")}, which will not exist with the levels and streams you chose.`);
      }

      teachers.push({name, subjects: teacherSubjects, classes: teacherClasses});
    });
  }

  if (errors.length) return {ok: false, errors};
  return {ok: true, plan: {schoolName, subjects, classes, teachers}};
};

// One readable sentence-block for the wizard's single error banner.
export const summariseErrors = (errors, max = 3) => {
  const shown = errors.slice(0, max).map((e) => e.message);
  const rest = errors.length - shown.length;
  return rest > 0 ? `${shown.join(" ")} (and ${rest} more to fix.)` : shown.join(" ");
};
