//lets create an endpoint to handle input of all the teachers in the school

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
		const newSubjects = subjects.map((name) => ({ name })); //this not like not like that
		const createdSubjects = await Subject.insertMany(newSubjects);
		res.status(201).json({
			success: true,
			message: `Created ${createdSubjects.length} subjects !`,
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
