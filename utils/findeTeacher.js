export default function findAvailableTeacher(
	teachers,
	subject,
	classroom,
	teacherAvailability,
	dayIndex,
	periodIndex
) {
	const subjectId = subject._id.toString();
	const classroomId = classroom._id.toString();

	// First: Try to find teacher assigned to this class
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`; //if the teacher is available i want to have a unique key for them
		// console.log(availabilityKey);
		// Prevent teacher from being double-booked across different classes at the same time
		if (teacherAvailability.has(availabilityKey)) {
			continue;
		}
		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId); //pointblank (s) stands for subject for short
		const assignedToClass = teacher.classes.some((c) => c._id.toString() === classroomId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && assignedToClass && isAvailable) {
			return teacher;
		}
	}

	//try any of the teacher who can teach the subject
	for (const teacher of teachers) {
		const teacherId = teacher._id.toString();
		const availabilityKey = `${teacherId}-${dayIndex}-${periodIndex}`;

		const canTeach = teacher.subjects.some((s) => s._id.toString() === subjectId);
		const isAvailable = !teacherAvailability.has(availabilityKey);

		if (canTeach && isAvailable) {
			return teacher;
		}
	}

	return null; // No available teacher found to avoid continual of the creation logic
}
