import mongoose, { Schema } from 'mongoose';

const subjectSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	name: {
		type: String,
		unique: true,
		trim: true,
		required: true,
	},
});

export const Subject = mongoose.model('Subject', subjectSchema);
