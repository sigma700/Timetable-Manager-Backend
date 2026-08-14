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

  // 2. Practical subjects (Sci) get doubled — at least 2 periods each
  for (const s of subjects) {
    const isPractical =
      practicalSubjects.includes(s._id.toString()) ||
      ["physics", "chemistry", "biology", "agriculture", "computer"].some((k) =>
        s.name.toLowerCase().includes(k),
      );
    if (isPractical && !freqMap.has(s._id.toString())) {
      freqMap.set(s._id.toString(), 4);
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

  return plan;
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
function enforceNoConsecutive(daySubjects) {
  const result = [...daySubjects];
  for (let i = 1; i < result.length; i++) {
    if (result[i]._id.toString() === result[i - 1]._id.toString()) {
      // Swap with next different subject
      let swapped = false;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j]._id.toString() !== result[i - 1]._id.toString()) {
          [result[i], result[j]] = [result[j], result[i]];
          swapped = true;
          break;
        }
      }
      if (!swapped) break; // nothing to swap — accept it
    }
  }
  return result;
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

  // Double period slot set builder
  const buildDoubleSlots = (day) =>
    new Set(
      doublePeriods.filter((dp) => dp.day === day).map((dp) => dp.period - 1),
    );

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
    const rawPlan = buildSubjectPlan(
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
        const subject = daySubjects[slot] ?? null;

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

        // For double periods prefer practical/heavy subjects
        const cat = classifySubject(subject.name);
        if (isDouble && cat === "light") {
          // Try to find a heavy subject to swap into this double slot
          const heavierIdx = daySubjects.findIndex(
            (s, i) => i > slot && classifySubject(s?.name) === "heavy",
          );
          if (heavierIdx !== -1) {
            [daySubjects[slot], daySubjects[heavierIdx]] = [
              daySubjects[heavierIdx],
              daySubjects[slot],
            ];
          }
        }

        const teacher = pickTeacher(
          teachers,
          subject,
          classroom,
          maps,
          dayIdx,
          slot,
          isDouble ? 1 : 0,
          maxWeeklyLoad,
        );

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
