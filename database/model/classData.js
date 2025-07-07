import mongoose, { Schema } from 'mongoose';

const validTypes = ['Class', 'Grade', 'Form'];
const clasRomsSchema = new Schema({
	school: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	type: { type: String, required: true, unique: true, enum: validTypes }, //eg if it is in form of grades or classes or forms
	levels: {
		min: { type: String, required: true },
		max: { type: String, required: true },
	}, //max and min
	labels: { type: Array, required: true },
});

const ClassData = mongoose.model('classe', clasRomsSchema);

export { ClassData };

//this part requires some fixing
