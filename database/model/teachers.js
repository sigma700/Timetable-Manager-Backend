import mongoose, { Schema } from 'mongoose';

const teacherSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	subjects: [
		{
			type: mongoose.Schema.Types.String,
			ref: 'Subject',
		},
	],
});

export const ListOfTechers = mongoose.model('teacher', teacherSchema);
