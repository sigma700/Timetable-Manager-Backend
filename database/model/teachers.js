import mongoose, { Schema } from 'mongoose';

const teacherSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	name: { type: String, required: true, unique: true },
	// _id: { type: String, required: true },
	subjects: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Subject',
		},
	],
});

export const ListOfTechers = mongoose.model('teacher', teacherSchema);
