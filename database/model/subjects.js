import mongoose, { Schema } from 'mongoose';

const subjectSchema = new Schema({
	subs: { type: String, unique: true },
});

export const Subject = mongoose.model('all-subject', subjectSchema);
