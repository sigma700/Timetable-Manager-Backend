import mongoose, { Schema } from 'mongoose';

const demoSchema = new Schema({
	fullName: {
		type: String,
		required: true,
		unique: true,
	},
	email: { type: String, required: true, unique: true },
	schoolName: { type: String, required: true, unique: true },
	date: { type: String, required: true },
	time: { type: String, required: true },
});

export const Demo = mongoose.model('Demo', demoSchema);
