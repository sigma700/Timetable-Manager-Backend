// import { ClassData } from '../models/classData.js';
import { ClassData } from '../database/model/classData.js';
import { ListOfTechers } from '../database/model/teachers.js';
// import { ListOfTechers } from '../models/teachers.js';
import calculateTime from '../utils/calculateTime.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS_PER_DAY = 6;
const PERIOD_DURATION = 45;
const START_TIME = '08:00';

const findAvailableTeacher = (
	teachers,
	subject,
	classroom,
	teacherAvailability,
	dayIndex,
	periodIndex
) => {
	const subjectId = subject._id.toString();
	const classroomId = classroom._id.toString();

	// Try to find teacher assigned to class first
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`;

		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId);
		const assignedToClass = teacher.classes.some((c) => c._id.toString() === classroomId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && assignedToClass && isAvailable) {
			return teacher;
		}
	}

	// Fallback to any teacher who can teach the subject
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`;

		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && isAvailable) {
			return teacher;
		}
	}

	return null;
};

export const generateSimpleTimetable = async (schoolId, config = {}) => {
	try {
		// Fetch data with proper population
		const classrooms = await ClassData.find({ school: schoolId })
			.populate({
				path: 'subjects',
				select: '_id name',
			})
			.lean();

		const teachers = await ListOfTechers.find({ school: schoolId })
			.populate({
				path: 'subjects',
				select: '_id name',
			})
			.populate({
				path: 'classes',
				select: '_id name',
			})
			.lean();

		const teacherAvailability = new Set();

		return classrooms.map((classroom) => {
			const dailySchedule = DAYS.map((day, dayIndex) => {
				const periods = Array(PERIODS_PER_DAY)
					.fill()
					.map((_, periodIndex) => {
						const subject = classroom.subjects[periodIndex % classroom.subjects.length];

						if (!subject) {
							return {
								day,
								periodNumber: periodIndex + 1,
								startTime: calculateTime(START_TIME, periodIndex * PERIOD_DURATION),
								endTime: calculateTime(START_TIME, (periodIndex + 1) * PERIOD_DURATION),
								subject: null,
								teacher: null,
								classroom: {
									_id: classroom._id,
									name: classroom.name,
								},
								warning: 'No subject assigned',
							};
						}

						const teacher = findAvailableTeacher(
							teachers,
							subject,
							classroom,
							teacherAvailability,
							dayIndex,
							periodIndex
						);

						if (teacher) {
							const availabilityKey = `${teacher._id}-${dayIndex}-${periodIndex}`;
							teacherAvailability.add(availabilityKey);
						}

						return {
							day,
							periodNumber: periodIndex + 1,
							startTime: calculateTime(START_TIME, periodIndex * PERIOD_DURATION),
							endTime: calculateTime(START_TIME, (periodIndex + 1) * PERIOD_DURATION),
							subject: {
								_id: subject._id,
								name: subject.name,
							},
							teacher: teacher
								? {
										_id: teacher._id,
										name: `${teacher.firstName} ${teacher.lastName}`,
								  }
								: null,
							classroom: {
								_id: classroom._id,
								name: classroom.name,
							},
							warning: teacher ? null : 'No available teacher',
						};
					});

				return { day, periods };
			});

			return {
				name: `Timetable for ${classroom.name}`,
				school: schoolId,
				schedule: dailySchedule, //here is where al the error was
				config: {
					periodsPerDay: PERIODS_PER_DAY,
					periodDuration: PERIOD_DURATION,
					startTime: START_TIME,
					breaks: config.breaks || [],
				},
				constraints: {},
			};
		});
	} catch (error) {
		console.error('Error generating timetable:', error);
		throw error;
	}
};
