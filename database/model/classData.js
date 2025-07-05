import mongoose, { Schema } from 'mongoose';

const validTypes = ['Class', 'Grade', 'Form'];
const clasRomsSchema = new Schema({
	type: { type: String, required: true, unique: true, enum: validTypes }, //eg if it is in form of grades or classes or forms
	levels: { type: Object, required: true }, //max and min
	labels: { type: String, required: true, unique: true },
});

const ClassData = mongoose.model('classe', clasRomsSchema);

export { ClassData };
