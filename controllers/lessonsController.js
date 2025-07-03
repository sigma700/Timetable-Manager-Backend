import { Timetable } from '../database/model/timetable.js';
import { Teacher } from '../database/model/users.js';
import { checkTimetableConflict } from '../middleware/checkOverlap.js';

export const createLesson = async (req, res) => {
	try {
		const teacher = await Teacher.findOne({ firstName: 'Allan' });
		if (!teacher) throw new Error('Teacher not found !');
		const newClass = req.body;
		const savedEntry = await Timetable.create(newClass);
		await checkTimetableConflict(newClass);
		res.status(201).json(savedEntry);
	} catch (error) {
		console.log(error);

		res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
