import { ClassData } from '../database/model/classData.js';
import { ListOfTechers } from '../database/model/teachers.js';
import insertBreaks from '../utils/addBreaks.js';
import calculateTime from '../utils/calculateTime.js';
import findAvailableTeacher from '../utils/findeTeacher.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
