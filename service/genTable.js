import {ClassData} from "../src/database/model/classData.js";
import {ListOfTechers} from "../src/database/model/teachers.js";
import insertBreaks from "../utils/addBreaks.js";
import calculateTime from "../utils/calculateTime.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Fisher-Yates shuffle — O(n), unbiased.
 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeAvailabilityMap() {
  const busy = new Set();
  return {
    isBusy: (tid, dayIdx, slot) => busy.has(`${tid}:${dayIdx}:${slot}`),
    markBusy: (tid, dayIdx, slot) => busy.add(`${tid}:${dayIdx}:${slot}`),
  };
}

/**
 * Find the best available teacher for a subject in a specific classroom.
 *
 * Filters by:
 *   1. Teacher must teach this subject
 *   2. Teacher must be assigned to this classroom
 *   3. Teacher must be free for the required slot(s)
 *
 * Shuffles candidates to distribute load evenly across teachers.
 *
 * @param {Array}  teachers     - all school teachers (populated)
 * @param {Object} subject      - { _id, name }
 * @param {Object} classroom    - { _id, name }
 * @param {Object} availability - shared availability map
 * @param {number} dayIdx       - 0..4
 * @param {number} slot         - period slot index (0-based)
 * @param {number} extraSlots   - additional consecutive slots to lock (double periods)
 * @returns {Object|null}
 */
function pickTeacher(
  teachers,
  subject,
  classroom,
  availability,
  dayIdx,
  slot,
  extraSlots = 0,
) {
  const subjectId = subject._id.toString();
  const classroomId = classroom._id.toString();

  const candidates = teachers.filter(
    (t) =>
      t.subjects.some((s) => s._id.toString() === subjectId) &&
      t.classes.some((c) => c._id.toString() === classroomId),
  );

  if (candidates.length === 0) return null;

  for (const teacher of shuffle(candidates)) {
    const tid = teacher._id.toString();
    let free = !availability.isBusy(tid, dayIdx, slot);

    for (let extra = 1; extra <= extraSlots && free; extra++) {
      free = !availability.isBusy(tid, dayIdx, slot + extra);
    }

    if (free) return teacher;
  }

  return null;
}

/**
 * Build a subject rotation plan for one classroom across the full week.
 *
 * Respects subjectWeeklyFrequency if provided. Remaining slots are filled
 * with a shuffled round-robin across all subjects.
 *
 * @param {Array}  subjects              - [{ _id, name }]
 * @param {number} periodsPerDay
 * @param {Array}  weeklyFrequencyConfig - [{ subject: ObjectId, requiredPeriods: number }]
 * @returns {Array[]} - 5-element array (one per day), each containing subject objects per slot
 */
function buildSubjectPlan(subjects, periodsPerDay, weeklyFrequencyConfig = []) {
  const totalSlots = periodsPerDay * DAYS.length;

  // Map subjectId -> requiredPeriods
  const freqMap = new Map(
    weeklyFrequencyConfig.map((e) => [e.subject.toString(), e.requiredPeriods]),
  );

  // Build priority pool: subjects appear proportionally to their frequency
  const pool = [];
  for (const subj of subjects) {
    const required = freqMap.get(subj._id.toString());
    if (required !== undefined) {
      for (let i = 0; i < required; i++) pool.push(subj);
    }
  }

  // Fill remaining slots with round-robin across all subjects
  const remaining = totalSlots - pool.length;
  if (remaining > 0) {
    const rotated = shuffle(subjects);
    for (let i = 0; i < remaining; i++) {
      pool.push(rotated[i % rotated.length]);
    }
  } else if (remaining < 0) {
    // Frequency requirements exceed available slots — trim
    pool.splice(totalSlots);
  }

  // Shuffle so subjects aren't always in the same days
  const shuffledPool = shuffle(pool);

  // Split into per-day arrays
  return Array.from({length: DAYS.length}, (_, d) =>
    shuffledPool.slice(d * periodsPerDay, (d + 1) * periodsPerDay),
  );
}

// ─────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────

export const generateSimpleTimetable = async (
  schoolId,
  config = {},
  constraints = {},
) => {
  // ── 1. Load data in parallel ───────────────────────────────────────────────
  const [classrooms, teachers] = await Promise.all([
    ClassData.find({school: schoolId})
      .populate({path: "subjects", select: "_id name"})
      .lean(),
    ListOfTechers.find({school: schoolId})
      .populate({path: "subjects", select: "_id name"})
      .populate({path: "classes", select: "_id name"})
      .lean(),
  ]);

  if (classrooms.length === 0) {
    throw new Error(
      "No classes found for this school. Add classes before generating a timetable.",
    );
  }
  if (teachers.length === 0) {
    throw new Error(
      "No teachers found for this school. Add teachers before generating a timetable.",
    );
  }

  // ── 2. Resolve config with safe defaults ───────────────────────────────────
  const periodsPerDay = config.periodsPerDay ?? 8;
  const periodDuration = config.periodDuration ?? 45; // minutes
  const startTime = config.startTime ?? "08:00";
  const breaks = config.breaks ?? [];
  const doublePeriods = config.doublePeriods ?? []; // [{ day, period }]
  const weeklyFrequency = constraints.subjectWeeklyFrequency ?? [];

  // ── 3. Global teacher availability — shared across ALL classrooms ──────────
  const availability = makeAvailabilityMap();

  // ── 4. Generate per-classroom timetables ───────────────────────────────────
  const timetables = classrooms.map((classroom) => {
    // Classroom has no subjects configured
    if (!classroom.subjects?.length) {
      return {
        name: `Timetable for ${classroom.name}`,
        school: schoolId,
        schedule: DAYS.map((day) => ({day, periods: []})),
        config: {
          periodsPerDay,
          periodDuration,
          startTime,
          breaks,
          doublePeriods,
        },
        warning: `No subjects assigned to ${classroom.name}`,
      };
    }

    // Build subject assignment plan for this classroom across the week
    const subjectPlan = buildSubjectPlan(
      classroom.subjects,
      periodsPerDay,
      weeklyFrequency,
    );

    // Set of 0-based slot indices that should be double periods on each day
    const doubleSlotsByDay = new Map(
      DAYS.map((day, dayIdx) => [
        dayIdx,
        new Set(
          doublePeriods
            .filter((dp) => dp.day === day)
            .map((dp) => dp.period - 1), // convert to 0-indexed
        ),
      ]),
    );

    const dailySchedule = DAYS.map((day, dayIdx) => {
      const daySubjects = subjectPlan[dayIdx];
      const doubleSlots = doubleSlotsByDay.get(dayIdx);
      const periods = [];
      let slot = 0;

      while (slot < periodsPerDay) {
        // Validate double period — needs room for two consecutive slots
        const wantsDouble = doubleSlots.has(slot);
        const isDouble = wantsDouble && slot + 1 < periodsPerDay;

        const durationMultiplier = isDouble ? 2 : 1;
        const periodStartTime = calculateTime(startTime, slot * periodDuration);
        const periodEndTime = calculateTime(
          startTime,
          (slot + durationMultiplier) * periodDuration,
        );
        const subject = daySubjects[slot] ?? null;

        if (!subject) {
          periods.push({
            day,
            periodNumber: slot + 1,
            isDoublePeriod: false,
            startTime: periodStartTime,
            endTime: periodEndTime,
            subject: null,
            teacher: null,
            classroom: {_id: classroom._id, name: classroom.name},
            warning: "No subject assigned",
          });
          slot++;
          continue;
        }

        // Find a teacher free for this slot (and next slot if double)
        const teacher = pickTeacher(
          teachers,
          subject,
          classroom,
          availability,
          dayIdx,
          slot,
          isDouble ? 1 : 0,
        );

        if (teacher) {
          const tid = teacher._id.toString();
          availability.markBusy(tid, dayIdx, slot);
          if (isDouble) availability.markBusy(tid, dayIdx, slot + 1);
        }

        periods.push({
          day,
          periodNumber: slot + 1,
          isDoublePeriod: isDouble,
          startTime: periodStartTime,
          endTime: periodEndTime,
          subject: {
            _id: subject._id,
            name: subject.name,
          },
          teacher: teacher ? {_id: teacher._id, name: teacher.name} : null,
          classroom: {_id: classroom._id, name: classroom.name},
          warning: teacher
            ? null
            : `No available teacher for ${subject.name} in ${classroom.name}`,
        });

        slot += durationMultiplier;
      }

      // Insert break slots cleanly — no time drift
      return {
        day,
        periods:
          breaks.length > 0
            ? insertBreaks(periods, breaks, startTime, periodDuration)
            : periods,
      };
    });

    return {
      name: `Timetable for ${classroom.name}`,
      school: schoolId,
      schedule: dailySchedule,
      config: {
        periodsPerDay,
        periodDuration,
        startTime,
        breaks,
        doublePeriods,
      },
    };
  });

  return timetables;
};
