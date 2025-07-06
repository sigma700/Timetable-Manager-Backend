import { Timetable } from '../database/model/timetable.js';
import { User } from '../database/model/users.js';
import { checkTimetableConflict } from '../middleware/checkOverlap.js';

export const createLesson = async (req, res) => {
	try {
		const teacher = await User.findOne({ firstName: 'Alvita' });
		if (!teacher) throw new Error('Teacher not found !');
		const newClass = req.body;
		await checkTimetableConflict(newClass); //makes sure that the code passes through this validation before creation
		const savedEntry = await Timetable.create(newClass);

		res.status(201).json(savedEntry);
	} catch (error) {
		console.log(error);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
