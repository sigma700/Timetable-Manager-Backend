//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { GenTable } from '../database/model/fullTable.js';
import { School } from '../database/model/school.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

import { generateSimpleTimetable } from '../service/genTable.js';
import { sendError } from '../utils/sendError.js';

//lets also list our school

export const listSchool = async (req, res) => {
	try {
		const { name } = req.body;
		//create the school
		const createdSchool = await School.create({ name });
		res.status(201).json({
			success: true,
			message: 'Created Successfully !',
			data: createdSchool,
		});
	} catch (error) {}
};

//done

export const listTeachers = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { firstName, lastName, subjects, classes } = req.body;

		const exisisting = await ListOfTechers.findOne({ firstName, lastName });

		if (exisisting) {
			return res.status(400).json({
				success: false,
				message: 'Teacher already exists !',
			});
		}

		const createdTeachers = await ListOfTechers.create({
			firstName,
			lastName,
			school: schoolId,
			subjects: subjects,
			classes: classes,
		});

		const populatedTeacher = await ListOfTechers.findById(createdTeachers._id)
			.populate('subjects')
			.populate('classes');

		res.status(201).json({
			success: true,
			message: 'Successfully created teacher !',
			data: populatedTeacher,
		});
	} catch (error) {
		console.log(error.message);
		sendError(res, error.message, 500);
	}
};

//done
export const listSubjects = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { names } = req.body;
		//automatically asign the school id to each subject
		const newSubjects = names.map((name) => ({ name: name.trim(), school: schoolId }));

		const createdSubjects = await Subject.insertMany(newSubjects);
		res.status(201).json({
			success: true,
			message: `Created ${names.length} subjects !`,
			data: createdSubjects,
		});
	} catch (error) {
		console.log(error.message);
		sendError(res, error.message, 500);
	}
};
//done
export const listClassData = async (req, res) => {
	try {
		//lets get all the data form the req.body
		const { schoolId } = req.params;
		const { type, levels, labels, subjects } = req.body;
		//in case user inputs the labels in lowercase then we convert it to uppercase yk
		const convertedLabels = labels.map((label) => String(label).toUpperCase());

		//i want to have a logic to make the classes have a joined structure such as 4A , 4B , 4C
		const minLevel = parseInt(levels.min);
		const maxLevel = parseInt(levels.max);
		const generatedClasses = [];

		for (let level = minLevel; level <= maxLevel; level++) {
			for (const label of convertedLabels) {
				generatedClasses.push({
					name: `Grade ${level}${label}`,
					level,
					label,
				});
			}
		}
		const createdClasses = await ClassData.create(
			generatedClasses.map((classData) => ({
				type,
				levels: {
					min: levels.min,
					max: levels.max,
				},
				labels: convertedLabels,
				name: classData.name,
				level: classData.level,
				label: classData.label,
				school: schoolId,
				isOccupied: false,
				subjects: subjects,
			}))
		);
		res.status(201).json({
			success: true,
			message: `${generatedClasses.length} classes added to the db !`,
			data: createdClasses,
		});
	} catch (error) {
		console.log(error.message);
		sendError(res, error.message, 500);
	}
};

//not to generate the actual timetable

export const genTimetableHandler = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { name, config } = req.body;

		// Generate timetable data
		const timetableData = await generateSimpleTimetable(schoolId, config);

		// Create the timetable document
		const timetable = await GenTable.create({
			name,
			school: schoolId,
			schedule: timetableData,
			constraints: {},
		});

		res.status(201).json({
			success: true,
			data: timetable,
		});
	} catch (error) {
		console.error('Timetable generation error:', error);
		res.status(500).json({
			success: false,
			message: error.message,
			errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});

		sendError(res, error.message, 500);
	}
};
