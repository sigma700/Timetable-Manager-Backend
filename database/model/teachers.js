import mongoose, { Schema } from 'mongoose';

const teacherSchema = new Schema({
	name: { type: String, required: true, unique: true },
});

export const ListOfTechers = mongoose.model('All-teachers', teacherSchema);
