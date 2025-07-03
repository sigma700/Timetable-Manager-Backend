import mongoose, { Schema } from 'mongoose';
import { checkTimetableConflict } from '../../middleware/checkOverlap.js';

const table = new Schema({
	subject: { type: String, required: true },
	day: { type: String, required: true },
	startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
	endTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
	teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
});
table.pre('save', async function (next) {
	console.log('Saving timetable entry :', this);

	try {
		await checkTimetableConflict(this); //this refers to the one being saved
		next();
	} catch (error) {
		next(error);
	}
});
const Timetable = mongoose.model('Lesson', table);

//lets use the function to check conflicts before saving to the database

export { Timetable };
