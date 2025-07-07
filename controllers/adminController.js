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

//done

export const listTeachers = async (req, res) => {
	try {
		const { schoolId } = req.params;
		const { firstName, lastName, subjects } = req.body;

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
			subjects,
		});
		res.status(201).json({
			success: true,
			message: 'Successfully created teacher !',
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
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
//done
export const listClassData = async (req, res) => {
	try {
		//lets get all the data form the req.body
		const { schoolId } = req.params;
		const { type, levels, labels } = req.body;
		//in case user inputs the labels in lowercase then we convert it to uppercase yk
		const convertedLabels = labels.map((label) => String(label).toUpperCase());

		const createdClassData = await ClassData.create({
			type,
			levels,
			labels: convertedLabels,
			school: schoolId,
		});
		res.status(201).json({
			success: true,
			message: `${createdClassData.length} classes added to the db !`,
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
		// const schoolId = req.params;
		const timetable = await generateTimetable('686939ac65244f797d3334b7');

		//save to db
		const createdTimetable = await Timetable.create({
			school: '686939ac65244f797d3334b7',
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
