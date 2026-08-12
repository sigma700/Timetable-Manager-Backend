import {ClassData} from "../src/database/model/classData.js";
import {ListOfTechers} from "../src/database/model/teachers.js";
import insertBreaks from "../utils/addBreaks.js";
import calculateTime from "../utils/calculateTime.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ─── Subject category classifier ──────────────────────────────────────────────
// Heavy = Sciences + Maths → morning bias
// Light = Languages, Humanities, PE → afternoon bias
const HEAVY_SUBJECTS = [
  "mathematics",
  "maths",
  "math",
  "physics",
  "chemistry",
  "biology",
  "computer",
  "agriculture",
];
const LIGHT_SUBJECTS = [
  "kiswahili",
  "english",
  "history",
  "geography",
  "cre",
  "ire",
  "hre",
  "art",
  "music",
  "pe",
  "games",
  "physical",
  "life skills",
  "business",
];

function classifySubject(name = "") {
  const n = name.toLowerCase();
  if (HEAVY_SUBJECTS.some((k) => n.includes(k))) return "heavy";
  if (LIGHT_SUBJECTS.some((k) => n.includes(k))) return "light";
  return "neutral";
}

// ─── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Global availability maps ──────────────────────────────────────────────────
// teacherBusy:    key = `${teacherId}:${dayIdx}:${slot}`
// teacherWeekly:  key = `${teacherId}`  → count of periods assigned
function makeGlobalMaps() {
  const busy = new Set();
  const weekly = new Map();
  return {
    isBusy: (tid, d, s) => busy.has(`${tid}:${d}:${s}`),
    markBusy: (tid, d, s) => busy.add(`${tid}:${d}:${s}`),
    weeklyLoad: (tid) => weekly.get(tid) ?? 0,
    addLoad: (tid, n = 1) => weekly.set(tid, (weekly.get(tid) ?? 0) + n),
  };
}

// ─── Pick teacher ──────────────────────────────────────────────────────────────
function pickTeacher(
  teachers,
  subject,
  classroom,
  maps,
  dayIdx,
  slot,
  extraSlots = 0,
  maxWeekly = 30,
) {
  const subjectId = subject._id.toString();
  const classroomId = classroom._id.toString();

  const candidates = teachers.filter(
    (t) =>
      t.subjects.some((s) => s._id.toString() === subjectId) &&
      t.classes.some((c) => c._id.toString() === classroomId) &&
      maps.weeklyLoad(t._id.toString()) + 1 + extraSlots <= maxWeekly,
  );

  if (!candidates.length) return null;

  // Sort: prefer lighter-loaded teachers for fairness
  const sorted = shuffle(candidates).sort(
    (a, b) =>
      maps.weeklyLoad(a._id.toString()) - maps.weeklyLoad(b._id.toString()),
  );

  for (const t of sorted) {
    const tid = t._id.toString();
    let free = !maps.isBusy(tid, dayIdx, slot);
    for (let x = 1; x <= extraSlots && free; x++)
      free = !maps.isBusy(tid, dayIdx, slot + x);
    if (free) return t;
  }
  return null;
}

// ─── Attempt to rescue a slot that has no available teacher ───────────────────
// Instead of leaving the slot teacher-less, look ahead in the same day's
// subject list for a subject that DOES have an available teacher at this slot,
// and swap it into place. This is a real-world necessity: with uneven
// subject/teacher/class coverage, a naive "give up and warn" approach produces
// timetables riddled with gaps even when a valid arrangement exists.
function attemptTeacherRescue(
  daySubjects,
  slotIdx,
  teachers,
  classroom,
  maps,
  dayIdx,
  slot,
  extraSlots,
  maxWeeklyLoad,
) {
  const blocked = new Set([daySubjects[slotIdx]?._id?.toString()]);
  for (let j = slotIdx + 1; j < daySubjects.length; j++) {
    const candidateSubject = daySubjects[j];
    if (!candidateSubject) continue;
    if (blocked.has(candidateSubject._id.toString())) continue;
    const candidateTeacher = pickTeacher(
      teachers,
      candidateSubject,
      classroom,
      maps,
      dayIdx,
      slot,
      extraSlots,
      maxWeeklyLoad,
    );
    if (candidateTeacher) {
      [daySubjects[slotIdx], daySubjects[j]] = [
        daySubjects[j],
        daySubjects[slotIdx],
      ];
      return {subject: daySubjects[slotIdx], teacher: candidateTeacher};
    }
  }
  return null;
}

// ─── Build subject pool with all Kenyan constraints ───────────────────────────
function buildSubjectPlan(
  subjects,
  periodsPerDay,
  weeklyFreq = [],
  practicalSubjects = [],
) {
  const totalSlots = periodsPerDay * DAYS.length;
  const freqMap = new Map(
    weeklyFreq.map((e) => [e.subject.toString(), e.requiredPeriods]),
  );

  // 1. Enforce Kiswahili minimum 5x per week (KCSE compliance)
  const kiswahili = subjects.find((s) =>
    s.name.toLowerCase().includes("kiswahili"),
  );
  if (kiswahili && !freqMap.has(kiswahili._id.toString())) {
    freqMap.set(
      kiswahili._id.toString(),
      Math.max(5, freqMap.get(kiswahili._id.toString()) ?? 0),
    );
  }

  // 2. Practical subjects (Sci) get doubled — at least 4 periods each
  const practicalIds = new Set();
  for (const s of subjects) {
    const isPractical =
      practicalSubjects.includes(s._id.toString()) ||
      ["physics", "chemistry", "biology", "agriculture", "computer"].some((k) =>
        s.name.toLowerCase().includes(k),
      );
    if (isPractical) {
      practicalIds.add(s._id.toString());
      if (!freqMap.has(s._id.toString())) {
        freqMap.set(s._id.toString(), 4);
      }
    }
  }

  // 3. Build priority pool
  const pool = [];
  for (const subj of subjects) {
    const req = freqMap.get(subj._id.toString());
    if (req) for (let i = 0; i < req; i++) pool.push(subj);
  }

  // 4. Fill remaining with balanced round-robin
  const rem = totalSlots - pool.length;
  if (rem > 0) {
    const rot = shuffle(subjects);
    for (let i = 0; i < rem; i++) pool.push(rot[i % rot.length]);
  } else if (rem < 0) {
    pool.splice(totalSlots);
  }

  // 5. Sort pool using time-of-day bias:
  //    Slots 0..3 = morning → heavy subjects first
  //    Slots 4..end = afternoon → light subjects first
  // Spread across days
  const shuffledPool = shuffle(pool);

  // Build 5-day plan then reorder each day's slots for time-of-day bias
  const plan = Array.from({length: DAYS.length}, (_, d) => {
    const daySlots = shuffledPool.slice(
      d * periodsPerDay,
      (d + 1) * periodsPerDay,
    );

    // Sort: heavy subjects to front, light to back
    return daySlots.sort((a, b) => {
      const catA = classifySubject(a.name);
      const catB = classifySubject(b.name);
      const order = {heavy: 0, neutral: 1, light: 2};
      return order[catA] - order[catB];
    });
  });

  return {plan, practicalIds};
}

// ─── Enforce max 2 appearances of same subject per day ────────────────────────
function enforceMaxTwoPerDay(daySubjects) {
  const count = {};
  const result = [];
  const deferred = [];

  for (const subj of daySubjects) {
    const key = subj._id.toString();
    if ((count[key] ?? 0) < 2) {
      result.push(subj);
      count[key] = (count[key] ?? 0) + 1;
    } else {
      deferred.push(subj);
    }
  }

  // Fill remaining slots with deferred subjects (still respect cap)
  const count2 = {...count};
  for (const subj of deferred) {
    const key = subj._id.toString();
    if ((count2[key] ?? 0) < 2) {
      result.push(subj);
      count2[key] = (count2[key] ?? 0) + 1;
    }
  }

  return result;
}

// ─── No consecutive same subject ──────────────────────────────────────────────
// Runs until stable (bounded) instead of a single pass, and avoids introducing
// a *new* adjacent duplicate at i+1 while fixing the one at i — the original
// single-pass version could leave residual back-to-back duplicates behind a
// swap it had already stepped past.
function enforceNoConsecutive(daySubjects) {
  let result = [...daySubjects];
  let changed = true;
  let guard = 0;
  const maxGuard = result.length * 2 + 4;

  while (changed && guard < maxGuard) {
    changed = false;
    guard++;
    for (let i = 1; i < result.length; i++) {
      if (result[i]._id.toString() === result[i - 1]._id.toString()) {
        for (let j = i + 1; j < result.length; j++) {
          const candidateId = result[j]._id.toString();
          const wouldCreateNewDup =
            i + 1 < result.length &&
            candidateId === result[i + 1]._id.toString();
          if (
            candidateId !== result[i - 1]._id.toString() &&
            !wouldCreateNewDup
          ) {
            [result[i], result[j]] = [result[j], result[i]];
            changed = true;
            break;
          }
        }
      }
    }
  }
  return result;
}

// ─── Break boundary resolution ─────────────────────────────────────────────────
// Normalizes whatever shape `breaks` config entries come in (afterPeriod,
// period, or startTime) into a Set of 1-indexed period numbers that a break
// immediately follows, for a given day. Supports optional day-scoping
// (`b.day` present → only applies to that day; absent → applies every day).
function buildBreakBoundaries(breaks, day, startTime, periodDuration) {
  const boundaries = new Set();
  for (const b of breaks) {
    if (b.day && b.day !== day) continue;

    if (b.afterPeriod != null) {
      boundaries.add(b.afterPeriod);
      continue;
    }
    if (b.period != null) {
      boundaries.add(b.period);
      continue;
    }
    if (b.startTime) {
      // Map a clock-time break onto the period boundary it falls after.
      for (let p = 1; p <= 20; p++) {
        if (calculateTime(startTime, p * periodDuration) === b.startTime) {
          boundaries.add(p);
          break;
        }
      }
    }
  }
  return boundaries;
}

// ─── Main generator ────────────────────────────────────────────────────────────
export const generateSimpleTimetable = async (
  schoolId,
  config = {},
  constraints = {},
) => {
  const [classrooms, teachers] = await Promise.all([
    ClassData.find({school: schoolId})
      .populate({path: "subjects", select: "_id name"})
      .lean(),
    ListOfTechers.find({school: schoolId})
      .populate({path: "subjects", select: "_id name"})
      .populate({path: "classes", select: "_id name"})
      .lean(),
  ]);

  if (!classrooms.length)
    throw new Error(
      "No classes found. Add classes before generating a timetable.",
    );
  if (!teachers.length)
    throw new Error(
      "No teachers found. Add teachers before generating a timetable.",
    );

  // Config with Kenyan-aware defaults
  const periodsPerDay = config.periodsPerDay ?? 8;
  const periodDuration = config.periodDuration ?? 45;
  const startTime = config.startTime ?? "08:00";
  const breaks = config.breaks ?? [];
  const doublePeriods = config.doublePeriods ?? [];
  const maxWeeklyLoad = config.maxTeacherPeriods ?? 30; // TSC guideline
  const weeklyFrequency = constraints.subjectWeeklyFrequency ?? [];
  const practicalSubs = constraints.practicalSubjects ?? [];

  // Global teacher availability — shared across ALL classrooms
  const maps = makeGlobalMaps();

  // Double period slot set builder — excludes any configured double period
  // whose span (period N and N+1) would be split by a break landing right
  // after period N. A double period only makes sense as one uninterrupted
  // block; if a break would fall inside it, we drop the double for that slot
  // rather than silently letting the break bisect it.
  const buildDoubleSlots = (day) => {
    const boundaries = buildBreakBoundaries(
      breaks,
      day,
      startTime,
      periodDuration,
    );
    return new Set(
      doublePeriods
        .filter((dp) => dp.day === day)
        .map((dp) => dp.period - 1)
        .filter((slot) => {
          const wouldSplit = boundaries.has(slot + 1);
          if (wouldSplit) {
            console.warn(
              `[timetable] Dropped double period on ${day} at period ${
                slot + 1
              }: a break is scheduled immediately after period ${
                slot + 1
              }, which would split the double period across the break.`,
            );
          }
          return !wouldSplit;
        }),
    );
  };

  const timetables = classrooms.map((classroom) => {
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

    // Build subject plan with all Kenyan constraints applied
    const {plan: rawPlan, practicalIds} = buildSubjectPlan(
      classroom.subjects,
      periodsPerDay,
      weeklyFrequency,
      practicalSubs,
    );

    // Apply per-day caps and consecutive rules
    const subjectPlan = rawPlan.map((daySlots) => {
      let processed = enforceMaxTwoPerDay(daySlots);
      processed = enforceNoConsecutive(processed);
      return processed;
    });

    const dailySchedule = DAYS.map((day, dayIdx) => {
      const daySubjects = subjectPlan[dayIdx];
      const doubleSlots = buildDoubleSlots(day);
      const periods = [];
      let slot = 0;

      while (slot < periodsPerDay) {
        const wantsDouble = doubleSlots.has(slot);
        const isDouble = wantsDouble && slot + 1 < periodsPerDay;
        const mult = isDouble ? 2 : 1;

        const periodStart = calculateTime(startTime, slot * periodDuration);
        const periodEnd = calculateTime(
          startTime,
          (slot + mult) * periodDuration,
        );
        let subject = daySubjects[slot] ?? null;

        if (!subject) {
          periods.push({
            day,
            periodNumber: slot + 1,
            isDoublePeriod: false,
            startTime: periodStart,
            endTime: periodEnd,
            subject: null,
            teacher: null,
            classroom: {_id: classroom._id, name: classroom.name},
            warning: "No subject assigned",
          });
          slot++;
          continue;
        }

        // For double periods, prefer a heavy/practical subject — a double
        // slot handed to a "light" subject wastes the slot originally meant
        // for sciences/labs. Widened from "only swap when light" to "swap
        // whenever it isn't already heavy", since neutral subjects shouldn't
        // occupy a double slot either when a heavy one is available later.
        if (isDouble && classifySubject(subject.name) !== "heavy") {
          const heavierIdx = daySubjects.findIndex(
            (s, i) => i > slot && classifySubject(s?.name) === "heavy",
          );
          if (heavierIdx !== -1) {
            [daySubjects[slot], daySubjects[heavierIdx]] = [
              daySubjects[heavierIdx],
              daySubjects[slot],
            ];
            subject = daySubjects[slot];
          }
        }

        let teacher = pickTeacher(
          teachers,
          subject,
          classroom,
          maps,
          dayIdx,
          slot,
          isDouble ? 1 : 0,
          maxWeeklyLoad,
        );

        // Rescue: if the chosen subject has no free teacher at this slot,
        // look for another subject later in the day's list that does, and
        // swap it in, instead of leaving the slot unstaffed.
        if (!teacher) {
          const rescue = attemptTeacherRescue(
            daySubjects,
            slot,
            teachers,
            classroom,
            maps,
            dayIdx,
            slot,
            isDouble ? 1 : 0,
            maxWeeklyLoad,
          );
          if (rescue) {
            subject = rescue.subject;
            teacher = rescue.teacher;
          }
        }

        if (teacher) {
          const tid = teacher._id.toString();
          maps.markBusy(tid, dayIdx, slot);
          maps.addLoad(tid, 1);
          if (isDouble) {
            maps.markBusy(tid, dayIdx, slot + 1);
            maps.addLoad(tid, 1);
          }
        }

        periods.push({
          day,
          periodNumber: slot + 1,
          isDoublePeriod: isDouble,
          startTime: periodStart,
          endTime: periodEnd,
          subject: {_id: subject._id, name: subject.name},
          teacher: teacher ? {_id: teacher._id, name: teacher.name} : null,
          classroom: {_id: classroom._id, name: classroom.name},
          isPractical: practicalIds.has(subject._id.toString()),
          warning: teacher
            ? null
            : `No available teacher for ${subject.name} in ${classroom.name}`,
        });

        slot += mult;
      }

      return {
        day,
        periods: breaks.length
          ? insertBreaks(periods, breaks, startTime, periodDuration)
          : periods,
      };
    });

    return {
      name: `Timetable for ${classroom.name}`,
      school: schoolId,
      schedule: dailySchedule,
      config: {periodsPerDay, periodDuration, startTime, breaks, doublePeriods},
    };
  });

  return timetables;
};
