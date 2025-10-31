import mongoose, { Schema } from 'mongoose';

const validTypes = ['Class', 'Grade', 'Form'];
const classSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
		enum: validTypes,
	},
	level: {
		type: Number,
		required: true,
	},
	label: {
		type: String,
		required: true,
	},
	isOccupied: {
		type: Boolean,
		default: false,
	},
	subjects: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Subject',
		},
	],
});

classSchema.index({ school: 1, name: 1 }, { unique: true });

const ClassData = mongoose.model('ClassData', classSchema);
export { ClassData };
