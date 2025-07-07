import mongoose from 'mongoose';
import moment from 'moment';
import { ClassData } from '../database/model/classData.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';
import calculateTime from '../utils/calculateTime.js';

// Helper function to calculate time

// Main timetable generation logic
export const generateSimpleTimetable = async (schoolId) => {
	//getting all data from the database
	const classrooms = await ClassData.find({ school: schoolId });
	const subjects = await Subject.find({ school: schoolId });
	const teachers = await ListOfTechers.find({ school: schoolId });

	// 2. Create basic timetable structure
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const periodsPerDay = 8; // 8 periods per day
	const timetable = [];
	//making the empty timetable slots
	for (const day of days) {
		const daySchedule = {
			day,
			periods: [],
		};

		// Add empty periods for each day
		for (let i = 0; i < periodsPerDay; i++) {
			daySchedule.periods.push({
				periodNumber: i + 1,
				startTime: calculateTime('08:00', i * 45),
				endTime: calculateTime('08:00', (i + 1) * 45),
				subject: null,
				teacher: null,
				classroom: null,
			});
		}
		timetable.push(daySchedule);
	}

	// 4. Assign subjects to periods (simple version)
	let subjectIndex = 0;
	let teacherIndex = 0;
	let classroomIndex = 0;

	for (const day of timetable) {
		for (const period of day.periods) {
			// Only fill if we have data available
			if (subjectIndex < subjects.length) {
				period.subject = subjects[subjectIndex]._id;
				subjectIndex++;
			}

			if (teacherIndex < teachers.length) {
				period.teacher = teachers[teacherIndex]._id;
				teacherIndex++;
			}

			if (classroomIndex < classrooms.length) {
				period.classroom = classrooms[classroomIndex]._id;
				classroomIndex++;
			}

			// Reset indexes if we reach the end
			if (subjectIndex >= subjects.length) subjectIndex = 0;
			if (teacherIndex >= teachers.length) teacherIndex = 0;
			if (classroomIndex >= classrooms.length) classroomIndex = 0;
		}
	}

	return timetable;
};
