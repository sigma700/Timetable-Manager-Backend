//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { School } from '../database/model/school.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';
import { Timetable } from '../database/model/timetable.js';
import { generateTimetable } from '../service/genTable.js';

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

export const listTeachers = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { name, subjects } = req.body;

		const createdTeachers = await ListOfTechers.create({
			name,
			school: schoolId,
			subjects,
		});
		res.status(201).json({
			success: true,
			message: `${name.length} teachers added sucessfully !`,
			data: createdTeachers,
		});
	} catch (error) {
		console.log(error.message);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

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
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

export const listClassData = async (req, res) => {
	try {
		//lets get all the data form the req.body
		const { type, levels, labels } = req.body;
		//in case user inputs the labels in lowercase then we convert it to uppercase yk
		const convertedLabels = labels.map((label) => String(label).toUpperCase());

		const createdClassData = await ClassData.create({ type, levels, labels: convertedLabels });
		res.status(201).json({
			success: true,
			message: `${createdClassData.length} data added to the db !`,
			data: createdClassData,
		});
	} catch (error) {
		console.log(error.message);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

//not to generate the actual timetable

export const genTable = async (req, res) => {
	try {
		const schoolId = req.params;
		const timetable = await generateTimetable(schoolId);

		//save to db
		const createdTimetable = await Timetable.create({
			school: schoolId,
			schedule: timetable,
		});

		res.status(201).json({
			success: true,
			message: 'Created the timetable !',
			data: createdTimetable,
		});
	} catch (error) {
		console.log(error.message);

		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
