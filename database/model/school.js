import mongoose, { Schema } from 'mongoose';

// models/School.js
const schoolSchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	address: String,
	contactEmail: String,
	phoneNumber: String,
});

export const School = mongoose.model('School', schoolSchema);
