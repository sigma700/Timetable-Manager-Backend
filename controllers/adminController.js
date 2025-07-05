//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

export const listTeachers = async (req, res) => {
	try {
		const { names } = req.body;
		const newTeachers = names.map((name) => ({ name }));
		const createdTeachers = await ListOfTechers.insertMany(newTeachers);
		res.status(201).json({
			success: true,
			message: `${names.length} teachers added sucessfully !`,
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
		const { subjects } = req.body;
		const newSubjects = subjects.map((subs) => ({ subs }));
		const createdSubjects = await Subject.insertMany(newSubjects);
		res.status(201).json({
			success: true,
			message: `Created ${subjects.length} subjects !`,
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
