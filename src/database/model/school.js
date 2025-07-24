import mongoose, { Schema } from 'mongoose';

// models/School.js
const schoolSchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	address: String,  //this is the main and the main area of thinking and should not be able to make sure that the same person is not the main character in the story and should make everything work out for u
	contactEmail: String,
	phoneNumber: String,
});

export const School = mongoose.model('School', schoolSchema);
