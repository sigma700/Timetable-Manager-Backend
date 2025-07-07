//backbone of the project

import moment from 'moment';
import { ClassData } from '../database/model/classData.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

export const generateTimetable = async (schoolId) => {
	//getting all the neccessary data that already exists from user inputs
	const classrooms = await ClassData.find({ school: schoolId });
	const subjects = await Subject.find({ school: schoolId });
	const teachers = await ListOfTechers.find({ school: schoolId });

	//creating empty timetable structure

	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const periodsPerDay = 8;
	const timetable = [];

	for (const day of days) {
		const daySchedule = {
			day,
			periods: [],
		};

		//creating empty periods for this day

		for (let i = 0; i < periodsPerDay; i++) {
			daySchedule.periods.push({
				periodNumber: i + 1,
				startTime: '18:00',
				endTime: '19:00',
				subject: null,
				teacher: null,
				classroom: null,
			});
		}
		timetable.push(daySchedule);
	}

	//asignment logic

	for (const subject of subjects) {
		//lets find a teacher who teaches this subject
		const availableTeachers = teachers.filter((teacher) => teacher.subjects.includes(subject._id));

		if (availableTeachers.length === 0) continue;

		for (const daySchedule of timetable) {
			//finding an empty period in this day
			const emptyPeriod = daySchedule.periods.find((period) => period.subject === null);
			if (!emptyPeriod) continue;
			const availableClassrooms = classrooms.find((classroom) => !classroom.isOccupied);
			if (!availableClassrooms) continue;

			//assign to this period
			const teacher = availableTeachers[0]; //pick the first available teacher
			emptyPeriod.subject = subject._id;
			emptyPeriod.teacher = teacher._id;
			emptyPeriod.classroom = availableClassrooms._id;

			availableClassrooms.isOccupied = true;
		}
		//finding available classrooms

		//calculate times for each period

		const periodDuration = 45;
		const startTime = '08:00';

		for (const daySchedule of timetable) {
			let currentTime = moment(startTime, 'HH:mm');
			for (const period of daySchedule.periods) {
				period.startTime = currentTime.format('HH:mm');
				currentTime.add(periodDuration, 'minutes');
				period.endTime = currentTime.format('HH:mm');
			}
		}
	}

	return timetable;
};
