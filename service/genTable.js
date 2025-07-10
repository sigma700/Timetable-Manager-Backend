import { ClassData } from '../database/model/classData.js';
import { ListOfTechers } from '../database/model/teachers.js';
import calculateTime from '../utils/calculateTime.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Enhanced insertBreaks function
function insertBreaks(periods, breaks, startTime, periodDuration) {
	if (!breaks || breaks.length === 0) return periods;

	// Create a working copy
	const updatedPeriods = JSON.parse(JSON.stringify(periods));
	let offset = 0;

	for (const brk of breaks) {
		const insertIndex = brk.afterPeriod + offset;

		// Calculate break times
		const lastPeriod = updatedPeriods[insertIndex - 1] || updatedPeriods[updatedPeriods.length - 1];
		const breakStartTime = lastPeriod
			? lastPeriod.endTime
			: calculateTime(startTime, brk.afterPeriod * periodDuration);
		const breakEndTime = calculateTime(breakStartTime, brk.duration);

		// Create break object
		const breakObj = {
			isBreak: true,
			name: brk.name,
			startTime: breakStartTime,
			endTime: breakEndTime,
			duration: brk.duration,
			periodNumber: null,
		};

		// Insert break
		updatedPeriods.splice(insertIndex, 0, breakObj);
		offset++;

		// Adjust timing for subsequent periods
		for (let i = insertIndex + 1; i < updatedPeriods.length; i++) {
			if (!updatedPeriods[i].isBreak) {
				updatedPeriods[i].startTime = calculateTime(updatedPeriods[i].startTime, brk.duration);
				updatedPeriods[i].endTime = calculateTime(updatedPeriods[i].endTime, brk.duration);
			}
		}
	}

	return updatedPeriods;
}

// Main timetable generator
export const generateSimpleTimetable = async (schoolId, config = {}) => {
	try {
		const classrooms = await ClassData.find({ school: schoolId })
			.populate('subjects', '_id name')
			.lean();

		const teachers = await ListOfTechers.find({ school: schoolId })
			.populate('subjects', '_id name')
			.populate('classes', '_id name')
			.lean();

		const teacherAvailability = new Set();

		const timetables = classrooms.map((classroom) => {
			// Use classroom-specific config if available
			const classroomConfig = {
				periodsPerDay: classroom.config?.periodsPerDay || config.periodsPerDay || 5,
				periodDuration: classroom.config?.periodDuration || config.periodDuration || 45,
				startTime: classroom.config?.startTime || config.startTime || '08:00',
				breaks: classroom.config?.breaks || config.breaks || [],
			};

			const dailySchedule = DAYS.map((day, dayIndex) => {
				// 1. First generate all base periods
				let periods = [];
				for (let periodIndex = 0; periodIndex < classroomConfig.periodsPerDay; periodIndex++) {
					const subjectIndex = periodIndex % classroom.subjects.length;
					const subject = classroom.subjects[subjectIndex];

					if (!subject) {
						periods.push({
							day,
							periodNumber: periodIndex + 1,
							startTime: calculateTime(
								classroomConfig.startTime,
								periodIndex * classroomConfig.periodDuration
							),
							endTime: calculateTime(
								classroomConfig.startTime,
								(periodIndex + 1) * classroomConfig.periodDuration
							),
							subject: null,
							teacher: null,
							classroom: { _id: classroom._id, name: classroom.name },
							warning: 'No subject assigned',
						});
						continue;
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
						teacherAvailability.add(`${teacher._id}-${dayIndex}-${periodIndex}`);
					}

					periods.push({
						day,
						periodNumber: periodIndex + 1,
						startTime: calculateTime(
							classroomConfig.startTime,
							periodIndex * classroomConfig.periodDuration
						),
						endTime: calculateTime(
							classroomConfig.startTime,
							(periodIndex + 1) * classroomConfig.periodDuration
						),
						subject: { _id: subject._id, name: subject.name },
						teacher: teacher
							? {
									_id: teacher._id,
									name: `${teacher.firstName} ${teacher.lastName}`,
							  }
							: null,
						classroom: { _id: classroom._id, name: classroom.name },
						warning: teacher ? null : 'No available teacher',
					});
				}

				// 2. THEN insert breaks which will adjust the timing automatically
				if (classroomConfig.breaks?.length > 0) {
					periods = insertBreaks(
						periods,
						classroomConfig.breaks,
						classroomConfig.startTime,
						classroomConfig.periodDuration
					);
				}

				return { day, periods };
			});

			return {
				name: `Timetable for ${classroom.name}`,
				school: schoolId,
				schedule: dailySchedule,
				config: classroomConfig,
			};
		});

		return timetables;
	} catch (error) {
		console.error('Error generating timetable:', error);
		throw error;
	}
};

//maintained the find teacher function
function findAvailableTeacher(
	teachers,
	subject,
	classroom,
	teacherAvailability,
	dayIndex,
	periodIndex
) {
	const subjectId = subject._id.toString();
	const classroomId = classroom._id.toString();

	// First: Try to find teacher assigned to this class
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`; //if the teacher is available i want to have a unique key for them
		// console.log(availabilityKey);
		// Prevent teacher from being double-booked across different classes at the same time
		if (teacherAvailability.has(availabilityKey)) {
			console.log(
				'Added the skipper to make sure that the teacher does not have two classes at the same time !'
			);
			continue;
		}
		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId); //pointblank (s) stands for subject for short
		const assignedToClass = teacher.classes.some((c) => c._id.toString() === classroomId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && assignedToClass && isAvailable) {
			return teacher;
		}
	}

	//try any of the teacher who can teach the subject
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`;

		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && isAvailable) {
			return teacher;
		}
	}

	return null; // No available teacher found to avoid continual of the creation logic
}
