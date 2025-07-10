// Import necessary modules
import { ClassData } from '../database/model/classData.js';
import { ListOfTechers } from '../database/model/teachers.js';
import calculateTime from '../utils/calculateTime.js';

// Constants
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS_PER_DAY = 6;
const PERIOD_DURATION = 45; // minutes
const START_TIME = '08:00'; // School start time

// Helper function to find an available teacher
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

// Main function to generate timetable
export const generateSimpleTimetable = async (schoolId, config = {}) => {
	try {
		// Get all classrooms for this school ith the id of ykk.....
		const classrooms = await ClassData.find({ school: schoolId })
			.populate('subjects', '_id name')
			.lean();

		// Get all teachers for this school
		const teachers = await ListOfTechers.find({ school: schoolId })
			.populate('subjects', '_id name')
			.populate('classes', '_id name')
			.lean();

		const teacherAvailability = new Set();

		// Create timetable for each classroom each at a time
		const timetables = classrooms.map((classroom) => {
			// Create schedule for each day
			const dailySchedule = DAYS.map((day, dayIndex) => {
				// Create periods for each day
				const periods = []; //init as empty array at first

				for (let periodIndex = 0; periodIndex < PERIODS_PER_DAY; periodIndex++) {
					const subjectIndex = periodIndex % classroom.subjects.length;
					const subject = classroom.subjects[subjectIndex];

					// Handle case where no subject exists
					if (!subject) {
						periods.push({
							day: day,
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
						});
						continue; // Skip to next period
					}

					// Find available teacher for this subject
					const teacher = findAvailableTeacher(
						teachers,
						subject,
						classroom,
						teacherAvailability,
						dayIndex,
						periodIndex
					);

					// Mark teacher as busy if found
					if (teacher) {
						const availabilityKey = `${teacher._id}-${dayIndex}-${periodIndex}`;
						teacherAvailability.add(availabilityKey);
					}

					// Create period entry
					periods.push({
						day: day,
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
					});
				}

				return { day, periods };
			});

			// Return final timetable for classroom
			return {
				name: `Timetable for ${classroom.name}`,
				school: schoolId,
				schedule: dailySchedule,
				config: {
					periodsPerDay: PERIODS_PER_DAY,
					periodDuration: PERIOD_DURATION,
					startTime: START_TIME,
					breaks: config.breaks || [],
				},
				constraints: {},
			};
		});

		const unassignedCount = timetables
			.flatMap((tt) => tt.schedule)
			.flatMap((d) => d.periods)
			.filter((p) => p.warning === 'No available teacher').length;

		if (unassignedCount > 0) {
			console.warn(`${unassignedCount} periods could not be assigned a teacher !`);
		}

		return timetables;
	} catch (error) {
		console.error('Error generating timetable for school !', error);
		throw error;
	}
};
