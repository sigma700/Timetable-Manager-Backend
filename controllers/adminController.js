//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { GenTable } from '../database/model/fullTable.js';
import { School } from '../database/model/school.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

import { generateSimpleTimetable } from '../service/genTable.js';
import { sendError, sendSucess } from '../utils/sendError.js';

//lets also list our school

export const listSchool = async (req, res) => {
	try {
		const { name } = req.body;
		//create the school
		const createdSchool = await School.create({ name });
		sendSucess(res, 'School created successfully !', createdSchool);
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

		sendSuccess(res, 'Successfully created teacher!', createdTeacher, 201);
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

		sendSuccess(res, `Created ${createdSubjects.length} subject(s)!`, createdSubjects, 201);
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

		sendSuccess(res, `Class data added to the database!`, createdClassData, 201);
	} catch (error) {
		console.error(error.message);
		sendError(res, error.message);
	}
};

//not to generate the actual timetable

export const genTimetableHandler = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { name, config } = req.body;

		// Generate timetable data
		const schedule = await generateSimpleTimetable(schoolId, config);

		// Create the timetable document
		const timetable = await GenTable.create({
			name: name.trim(),
			school: schoolId,
			schedule,
			constraints: {},
		});

		sendSucess(res, 'Timetable generated ans saved to the database !', timetable, 201);
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
