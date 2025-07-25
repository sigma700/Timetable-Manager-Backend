import mongoose, { Schema } from 'mongoose';

const teacherSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	name: { type: String, required: true },
	subjects: [
		{
			type: mongoose.Schema.Types.String,
			ref: 'Subject',
		},
	],
	classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClassData' }],
});

export const ListOfTechers = mongoose.model('teacher', teacherSchema);
