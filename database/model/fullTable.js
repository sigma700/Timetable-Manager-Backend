import mongoose, { Schema } from 'mongoose';

const timetableSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		school: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		config: {
			periodsPerDay: {
				type: Number,
				default: 8,
			},
			periodDuration: {
				type: Number,
				default: 45,
			},
			startTime: {
				type: String,
				default: '08:00',
			},
			breaks: [
				{
					name: String,
					afterPeriod: Number,
					duration: Number,
					_id: false,
				},
			],
		},
		schedule: [
			{
				name: String,
				school: {
					type: Schema.Types.ObjectId,
					ref: 'School',
				},
				schedule: [
					{
						day: String,
						periods: [
							{
								day: String,
								periodNumber: {
									type: Number,
									required: true,
								},
								startTime: {
									type: String,
									required: true,
								},
								endTime: {
									type: String,
									required: true,
								},
								subject: {
									_id: {
										type: Schema.Types.ObjectId,
										ref: 'Subject',
									},
									name: String,
								},
								teacher: {
									_id: {
										type: Schema.Types.ObjectId,
										ref: 'ListOfTechers',
									},
									name: String,
								},
								classroom: {
									_id: {
										type: Schema.Types.ObjectId,
										ref: 'ClassData',
									},
									name: String,
								},
								warning: String,
								_id: false,
							},
						],
						_id: false,
					},
				],
				config: {
					periodsPerDay: Number,
					periodDuration: Number,
					startTime: String,
					breaks: [
						{
							name: String,
							afterPeriod: Number,
							duration: Number,
							_id: false,
						},
					],
				},
				constraints: {},
				_id: false,
			},
		],
		constraints: {
			subjectWeeklyFrequency: [
				{
					subject: {
						type: Schema.Types.ObjectId,
						ref: 'Subject',
					},
					requiredPeriods: Number,
					_id: false,
				},
			],
		},
	},
	{
		timestamps: true,
	}
);

// Add index for faster queries
timetableSchema.index({ school: 1, name: 1 }, { unique: true });

export const GenTable = mongoose.model('Timetable', timetableSchema);
