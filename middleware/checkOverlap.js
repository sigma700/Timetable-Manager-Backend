//middleware for checking in case of any overlaps in the timetable

import { Timetable } from '../database/model/timetable.js';

//findiing any existing classroom on the same Day
export const checkTimetableConflict = async (newClass) => {
	const existingClass = await Timetable.findOne({
		day: newClass.day,
		$or: [
			{
				startTime: { $lt: this.endTime }, //existing class end before the new one ends
				endTime: { $lt: this.startTime }, //exisisting one end before the new one starts
			},
		],
	});

	//2.If overlap is found then throw a new error
	if (existingClass) {
		throw new Error(`Conflict with ${existingClass.subject} at ${existingClass.startTime}`);
	}
	//in case of no conflict then save
	next();
};
