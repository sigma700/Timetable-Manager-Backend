import calculateTime from './calculateTime.js';

// Enhanced insertBreaks function
export default function insertBreaks(periods, breaks, startTime, periodDuration) {
	if (!breaks || breaks.length === 0) return periods;

	// Create a working copy
	const updatedPeriods = JSON.parse(JSON.stringify(periods));
	let offset = 0;

	for (const brk of breaks) {
		const insertIndex = brk.afterPeriod + offset;

		// Calculate break times
		const lastPeriod = updatedPeriods[insertIndex - 1] || updatedPeriods[updatedPeriods.length - 1];
		const breakStartTime = lastPeriod
			? lastPeriod.endTime
			: calculateTime(startTime, brk.afterPeriod * periodDuration);
		const breakEndTime = calculateTime(breakStartTime, brk.duration);

		// Create break object
		const breakObj = {
			isBreak: true,

			name: brk.name,
			startTime: breakStartTime,
			endTime: breakEndTime,
			duration: brk.duration,
			periodNumber: null,
		};

		// Insert break
		updatedPeriods.splice(insertIndex, 0, breakObj);
		offset++;

		// Adjust timing for subsequent periods
		for (let i = insertIndex + 1; i < updatedPeriods.length; i++) {
			if (!updatedPeriods[i].isBreak) {
				updatedPeriods[i].startTime = calculateTime(updatedPeriods[i].startTime, brk.duration);
				updatedPeriods[i].endTime = calculateTime(updatedPeriods[i].endTime, brk.duration);
			}
		}
	}

	return updatedPeriods;
}
