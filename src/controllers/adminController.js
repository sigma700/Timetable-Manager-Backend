//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { GenTable } from '../database/model/fullTable.js';
import { School } from '../database/model/school.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

import { generateSimpleTimetable } from '../../service/genTable.js';
import { sendError, sendSucess } from '../../utils/sendError.js';

export const listSchool = async (req, res) => {
	try {
		const { name } = req.body;
		//create the school
		const createdSchool = await School.create({ name });
		return sendSucess(res, 'School created successfully !', createdSchool);
	} catch (error) {
		sendError(res, error.message);
	}
};

//done

export const listTeachers = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { firstName, lastName, subjects } = req.body;

		if (!schoolId || !firstName || !lastName || !Array.isArray(subjects) || subjects.length === 0) {
			return sendError(res, 'Missing or invalid teacher data', 400);
		}

		const existing = await ListOfTechers.findOne({ firstName, lastName, school: schoolId });
		if (existing) {
			return sendError(res, 'Teacher already exists in this school!', 400);
		}

		const createdTeacher = await ListOfTechers.create({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			school: schoolId,
			subjects,
		});

		return sendSuccess(res, 'Successfully created teacher!', createdTeacher, 201);
	} catch (error) {
		console.error(error.message);
		sendError(res, error.message);
	}
};

//done

export const listSubjects = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { names } = req.body;

		if (!schoolId || !Array.isArray(names) || names.length === 0) {
			return sendError(res, 'Missing or invalid subject data', 400);
		}

		const newSubjects = names
			.filter((name) => typeof name === 'string' && name.trim())
			.map((name) => ({ name: name.trim(), school: schoolId }));

		if (newSubjects.length === 0) {
			return sendError(res, 'No valid subject names provided', 400);
		}

		const createdSubjects = await Subject.insertMany(newSubjects);

		return sendSuccess(res, `Created ${createdSubjects.length} subject(s)!`, createdSubjects, 201);
	} catch (error) {
		console.error(error.message);
		sendError(res, error.message);
	}
};
export const listClassData = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { type, levels, labels } = req.body;

		if (
			!schoolId ||
			!type ||
			!Array.isArray(levels) ||
			!Array.isArray(labels) ||
			labels.length === 0
		) {
			return sendError(res, 'Missing or invalid class data', 400);
		}

		const convertedLabels = labels.map((label) => String(label).toUpperCase());

		const createdClassData = await ClassData.create({
			type: type.trim(),
			levels,
			labels: convertedLabels,
			school: schoolId,
		});

		return sendSuccess(res, `Class data added to the database!`, createdClassData, 201);
	} catch (error) {
		console.error(error.message);
		sendError(res, error.message);
	}
};

export const genTimetableHandler = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { name, config } = req.body;

		// Generate timetable data
		const timetables = await generateSimpleTimetable(schoolId, config);

		// Create the timetable document
		const timetable = await GenTable.create({
			name: name.trim(),
			school: schoolId,
			timetables,
			config,
			constraints: {},
		});

		return sendSucess(res, 'Timetable generated ans saved to the database !', timetable, 201);
	} catch (error) {
		console.error('Timetable generation error:', error);
		res.status(500).json({
			success: false,
			message: error.message,
			errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});

		sendError(res, error.message);
	}
};

//here lets create a new fucntion for updating the timetable
export const updateTimetable = async (req, res) => {
	try {
		const { timetableId } = req.params;
		const updateData = req.body;

		if (!timetableId || !updateData || typeof updateData !== 'object') {
			return sendError(res, 'Missing timetable ID or update data', 400);
		}

		const timetable = await GenTable.findOneAndUpdate({ _id: timetableId });
		if (!timetable) {
			return sendError(res, 'Timetable not found', 404);
		}
		//to check if the config had changed
		const isConfigUpdate =
			updateData.config &&
			(updateData.config.periodDuration !== timetable.config.periodDuration ||
				updateData.config.startTime !== timetable.config.startTime ||
				JSON.stringify(updateData.config.breaks) !== JSON.stringify(timetable.config.breaks));

		Object.keys(updateData).forEach((key) => {
			timetable[key] = updateData[key];
		});

		if (updateData.updateNestedConfigs && updateData.config) {
			timetable.timetables.forEach((nestedTimetable) => {
				nestedTimetable.config = { ...nestedTimetable.config, ...updateData.config };
			});
		}

		// Recalculate times if config changed
		if (isConfigUpdate) {
			timetable.timetables.forEach((nestedTimetable) => {
				nestedTimetable.schedule = calculatePeriodTimes(
					nestedTimetable.schedule,
					nestedTimetable.config
				);
			});
		}

		await timetable.save();

		return sendSucess(res, 'Timetable updated successfully!', timetable, 200);
	} catch (error) {
		console.log(error);
		sendError(res, error.message, 500);
	}
};
