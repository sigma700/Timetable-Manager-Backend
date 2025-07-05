//basic settings from the user

import mongoose, { Schema } from 'mongoose';

const settingSchema = new Schema({
	periodsPerDy: { type: Number, required: true },
	periodsDuration: { type: String, required: true },
	startTime: { type: String, required: true },
});

export const PeriodSetting = mongoose.model('PeriodSetting', settingSchema); //
