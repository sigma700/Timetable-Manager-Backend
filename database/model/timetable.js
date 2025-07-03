import mongoose, { Schema } from 'mongoose';

const table = new Schema({
	subject: { type: String, required: true },
	day: { type: String, required: true },
	startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
	endTime: { type: String, required: true },
	teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
});

const Timetable = mongoose.model('Lesson', table);
await Timetable.save();
export { Timetable };
