//middleware for checking in case of any overlaps in the timetable

import { Timetable } from '../database/model/timetable.js';

//findiing any existing classroom on the same Day
export const checkTimetableConflict = async (newClass) => {
	//time validation
	if (newClass.endTime <= newClass.startTime) {
		throw new Error('End time must be after start time');
	}

	//checking for overlapping classrooms by the same teacher !
	const existingClass = await Timetable.findOne({
		day: newClass.day,
		teacher: newClass.teacher,
		class: newClass.class,
		$or: [
			{
				//case 1 the new class starts before the old one ends
				startTime: { $lt: newClass.endTime }, //existing class starts before the new one ends.
				endTime: { $gt: newClass.startTime }, //exisisting one end before the new one starts.
			},

			//case 2 new class completely contains the existing class
			{
				endTime: { $gte: newClass.startTime },
				startTime: { $lte: newClass.endTime },
			},
		],
	});

	//2.If overlap is found then throw a new error
	if (existingClass) {
		throw new Error(
			`Teacher already has ${existingClass.subject} in ${existingClass.class} at ${existingClass.startTime}-${existingClass.endTime}`
		);
	}
};
