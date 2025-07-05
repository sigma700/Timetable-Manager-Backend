import mongoose, { Schema } from 'mongoose';

// models/Timetable.js
const timetableSchema = new Schema(
	{
		name: { type: String, required: true },
		school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },

		// Configuration (provided by user)
		config: {
			periodsPerDay: { type: Number, default: 8 },
			periodDuration: { type: Number, default: 45 }, // minutes
			startTime: { type: String, default: '08:00' }, // First period start
			breaks: [
				{
					name: String,
					afterPeriod: Number,
					duration: Number,
				},
			],
		},

		// Auto-generated timetable
		schedule: [
			{
				day: {
					type: String,
					enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
					required: true,
				},
				periods: [
					{
						periodNumber: Number,
						startTime: String, // "HH:MM"
						endTime: String,
						subject: { type: mongoose.Schema.Types.ObjectId, ref: 'all-subjects' },
						teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'all-teachers' },
						classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'classes' },
					},
				],
			},
		],

		// Constraints
		constraints: {
			teacherMinPeriods: Number,
			subjectWeeklyFrequency: [
				{
					subject: { type: mongoose.Schema.Types.ObjectId, ref: 'all-subjects' },
					requiredPeriods: Number,
				},
			],
		},
	},
	{ timestamps: true }
);

export const GenTable = new mongoose.model('timetable', timetableSchema);
