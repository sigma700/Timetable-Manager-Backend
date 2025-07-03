import { Timetable } from '../database/model/timetable.js';
import { checkTimetableConflict } from '../middleware/checkOverlap.js';

export const createLesson = async (req, res) => {
	try {
		const newClass = req.body;
		const savedEntry = await Timetable.create(newClass);
		await checkTimetableConflict(newClass);
		res.status(201).json(savedEntry);
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
