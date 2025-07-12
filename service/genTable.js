import { ClassData } from '../src/database/model/classData.js';
import { ListOfTechers } from '../src/database/model/teachers.js';
import insertBreaks from '../utils/addBreaks.js';
import calculateTime from '../utils/calculateTime.js';
import findAvailableTeacher from '../utils/findeTeacher.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Main timetable generator
// Modified generateSimpleTimetable function with double period support
export const generateSimpleTimetable = async (schoolId, config = {}) => {
	try {
		const classrooms = await ClassData.find({ school: schoolId })
			.populate('subjects', '_id name')
			.lean();

		const teachers = await ListOfTechers.find({ school: schoolId })
			.populate('subjects', '_id name')
			.populate('classes', '_id name')
			.lean();

		const teacherAvailability = new Set(); //i wanna be a 10X software engineer !
		const timetables = classrooms.map((classroom) => {
			const classroomConfig = {
				periodsPerDay: classroom.config?.periodsPerDay || config.periodsPerDay || 5,
				periodDuration: classroom.config?.periodDuration || config.periodDuration || 45,
				startTime: classroom.config?.startTime || config.startTime || '08:00',
				breaks: classroom.config?.breaks || config.breaks || [],
				doublePeriods: classroom.config?.doublePeriods || config.doublePeriods || [], // Add double periods config
			};

			const dailySchedule = DAYS.map((day, dayIndex) => {
				let periods = [];
				let periodIndex = 0;

				while (periodIndex < classroomConfig.periodsPerDay) {
					const subjectIndex = periodIndex % classroom.subjects.length;
					const subject = classroom.subjects[subjectIndex];

					// Check if this should be a double period
					const isDoublePeriod = classroomConfig.doublePeriods.some(
						(dp) => dp.day === day && dp.period === periodIndex + 1
					);

					const durationMultiplier = isDoublePeriod ? 2 : 1;
					const periodDuration = classroomConfig.periodDuration * durationMultiplier;

					if (!subject) {
						periods.push({
							day,
							periodNumber: periodIndex + 1,
							isDoublePeriod,
							startTime: calculateTime(
								classroomConfig.startTime,
								periodIndex * classroomConfig.periodDuration
							),
							endTime: calculateTime(
								classroomConfig.startTime,
								(periodIndex + durationMultiplier) * classroomConfig.periodDuration
							),
							subject: null,
							teacher: null,
							classroom: { _id: classroom._id, name: classroom.name },
							warning: 'No subject assigned',
						});
						periodIndex += durationMultiplier;
						continue;
					}

					// Find available teacher for all slots in double period
					let teacher = null;
					if (isDoublePeriod) {
						// Check if teacher is available for both periods
						const isAvailable =
							!teacherAvailability.has(`${subject._id}-${dayIndex}-${periodIndex}`) &&
							!teacherAvailability.has(`${subject._id}-${dayIndex}-${periodIndex + 1}`);

						if (isAvailable) {
							teacher = findAvailableTeacher(
								teachers,
								subject,
								classroom,
								teacherAvailability,
								dayIndex,
								periodIndex
							);

							if (teacher) {
								// Mark both periods as occupied
								teacherAvailability.add(`${teacher._id}-${dayIndex}-${periodIndex}`);
								teacherAvailability.add(`${teacher._id}-${dayIndex}-${periodIndex + 1}`);
							}
						}
					} else {
						teacher = findAvailableTeacher(
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
					}

					periods.push({
						day,
						periodNumber: periodIndex + 1,
						isDoublePeriod,
						startTime: calculateTime(
							classroomConfig.startTime,
							periodIndex * classroomConfig.periodDuration
						),
						endTime: calculateTime(
							classroomConfig.startTime,
							(periodIndex + durationMultiplier) * classroomConfig.periodDuration
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

					periodIndex += durationMultiplier;
				}

				// Insert breaks after generating all periods
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
