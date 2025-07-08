import mongoose, { Schema } from 'mongoose';

const timetableSchema = new Schema(
	{
		name: { type: String, required: true },
		school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
		config: {
			periodsPerDay: { type: Number, default: 8 },
			periodDuration: { type: Number, default: 45 },
			startTime: { type: String, default: '08:00' },
			breaks: [
				{
					name: String,
					afterPeriod: Number,
					duration: Number,
				},
			],
		},
		schedule: [
			{
				day: { type: String },
				periods: [
					{
						periodNumber: { type: Number, required: true },
						startTime: { type: String, required: true },
						endTime: { type: String, required: true },
						subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
						teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }, // Changed from ListOfTeachers
						classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, // Changed from ClassData
					},
				],
			},
		],
		constraints: {
			teacherMinPeriods: Number,
			subjectWeeklyFrequency: [
				{
					subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }, // Changed from all-subjects
					requiredPeriods: Number,
				},
			],
		},
	},
	{ timestamps: true }
);

export const GenTable = mongoose.model('Timetable', timetableSchema);
