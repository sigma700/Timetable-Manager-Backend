import { GenTable } from '../database/model/fullTable.js';

export const checkTimetableConflict = async (newClass, excludeId = null) => {
	// Time validation

	if (newClass.endTime <= newClass.startTime) {
		throw new Error('End time must be after start time');
	}

	// Base query to exclude current document during updates
	const baseQuery = {};
	if (excludeId) baseQuery._id = { $ne: excludeId };

	const teacherConflict = await GenTable.findOne({
		...baseQuery,
		day: newClass.day,
		teacher: newClass.teacher,
		$and: [{ startTime: { $lt: newClass.endTime } }, { endTime: { $gt: newClass.startTime } }],
	})
		.populate('subject', 'name')
		.populate('class', 'name');

	if (teacherConflict) {
		throw new Error(
			`Teacher already has ${teacherConflict.subject.name} in ${teacherConflict.class.name} at ${teacherConflict.startTime}-${teacherConflict.endTime}`
		);
	}

	const classroomConflict = await GenTable.findOne({
		...baseQuery,
		day: newClass.day,
		class: newClass.class, // Classroom ID
		$and: [{ startTime: { $lt: newClass.endTime } }, { endTime: { $gt: newClass.startTime } }],
	})
		.populate('subject', 'name')
		.populate('teacher', 'firstName lastName');

	if (classroomConflict) {
		throw new Error(
			`Classroom is already occupied by ${classroomConflict.subject.name} (Teacher: ${classroomConflict.teacher.firstName} ${classroomConflict.teacher.lastName}) at ${classroomConflict.startTime}-${classroomConflict.endTime}`
		);
	}
};
