//lets create an endpoint to handle input of all the teachers in the school

import { ClassData } from '../database/model/classData.js';
import { GenTable } from '../database/model/fullTable.js';
import { School } from '../database/model/school.js';
import { Subject } from '../database/model/subjects.js';
import { ListOfTechers } from '../database/model/teachers.js';

import { generateSimpleTimetable } from '../../service/genTable.js';
import { sendError, sendSucess } from '../../utils/sendError.js';
import { User } from '../database/model/users.js';
import { sendIdMail } from '../../resend/sendEmail.js';
import mongoose from 'mongoose';

export const listSchool = async (req, res) => {
	try {
		const { name } = req.body;

		const userId = req.userId;

		console.log(userId);

		// Create the school
		const createdSchool = await School.create({ name });

		// If userId is provided, associate the school with that user
		if (userId) {
			await User.findByIdAndUpdate(userId, { school: createdSchool._id }, { new: true });
		}

		const schoolId = createdSchool._id;

		await sendIdMail(schoolId);

		return sendSucess(res, 'School created successfully!', {
			school: createdSchool,
			userId: userId || null,
		});
	} catch (error) {
		sendError(res, error.message);
	}
};

export const listSubjects = async (req, res) => {
	try {
		const userId = req.userId; // From authentication middleware

		// Get user with school populated
		const user = await User.findById(userId).populate('school');

		if (!user || !user.school) {
			return sendError(res, 'User is not associated with any school', 400);
		}

		const schoolId = user.school._id;
		const { names } = req.body;

		console.log('SchoolId from user object:', schoolId);

		// Add ObjectId validation
		if (!schoolId || schoolId === 'undefined' || !mongoose.Types.ObjectId.isValid(schoolId)) {
			return sendError(res, 'Invalid or missing school ID', 400);
		}

		if (!Array.isArray(names) || names.length === 0) {
			return sendError(res, 'Missing or invalid subject data', 400);
		}

		const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

		const newSubjects = names
			.filter((name) => typeof name === 'string' && name.trim())
			.map((name) => ({
				name: name.trim(),
				school: schoolObjectId,
			}));

		if (newSubjects.length === 0) {
			return sendError(res, 'No valid subject names provided', 400);
		}

		const createdSubjects = await Subject.insertMany(newSubjects);

		return sendSucess(res, `Created ${createdSubjects.length} subject(s)!`, createdSubjects, 201);
	} catch (error) {
		console.error(error.message);

		// Handle duplicate key errors kawabangaa mate
		if (error.code === 11000) {
			return sendError(res, 'Some subjects already exist in this school', 400);
		}

		sendError(res, error.message);
	}
};

//this is my code do not dare and steal it because i will sue you as a thief of mental property
export const listClassData = async (req, res) => {
	try {
		const userId = req.userId; // From authentication middleware

		// Get user with school populated
		const user = await User.findById(userId).populate('school');

		if (!user || !user.school) {
			return sendError(res, 'User is not associated with any school', 400);
		}

		const schoolId = user.school._id; // Get schoolId from user object
		const { type, minLevel, maxLevel, labels } = req.body;

		console.log('SchoolId from user object:', schoolId);

		// Validation
		if (!schoolId || schoolId === 'undefined' || !mongoose.Types.ObjectId.isValid(schoolId)) {
			return sendError(res, 'Invalid or missing school ID', 400);
		}

		if (!type || minLevel === undefined || maxLevel === undefined || !labels?.length) {
			return sendError(res, 'Missing required fields', 400);
		}

		// Check if type is valid
		const validTypes = ['Class', 'Grade', 'Form'];
		if (!validTypes.includes(type)) {
			return sendError(res, `Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
		}

		const min = parseInt(minLevel);
		const max = parseInt(maxLevel);

		if (isNaN(min) || isNaN(max) || min > max) {
			return sendError(res, 'Invalid level range', 400);
		}

		const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

		// Get all subjects taught in the school
		const allSubjects = await Subject.find({ school: schoolObjectId });
		const subjectIds = allSubjects.map((subject) => subject._id);

		const classes = [];
		for (let level = min; level <= max; level++) {
			for (const label of labels.map((l) => String(l).toUpperCase())) {
				classes.push({
					name: `${type.trim()} ${level}${label}`,
					type: type.trim(),
					level,
					label,
					school: schoolObjectId, // Use ObjectId
					isOccupied: false,
					subjects: subjectIds,
				});
			}
		}

		const createdClasses = await ClassData.insertMany(classes);

		return sendSucess(res, `${createdClasses.length} classes created`, createdClasses, 201);
	} catch (error) {
		console.error(error);
		if (error.code === 11000) {
			return sendError(res, 'Some of these classes already exist', 400);
		}
		sendError(res, error.message);
	}
};

export const listTeachers = async (req, res) => {
	try {
		const userId = req.userId;

		const user = await User.findById(userId).populate('school');

		if (!user || !user.school) {
			return sendError(res, 'User is not associated with any school', 400);
		}

		const schoolId = user.school._id; // Get schoolId from user object
		const { name, subjects, classesNames } = req.body;

		console.log('SchoolId from user object:', schoolId);

		if (!schoolId || schoolId === 'undefined' || !mongoose.Types.ObjectId.isValid(schoolId)) {
			return sendError(res, 'Invalid or missing school ID', 400);
		}

		if (
			!name ||
			!Array.isArray(subjects) ||
			subjects.length === 0 ||
			!Array.isArray(classesNames)
		) {
			return sendError(res, 'Missing or invalid teacher data', 400);
		}

		const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

		// Check if teacher already exists - use ObjectId
		const existing = await ListOfTechers.findOne({
			name,
			school: schoolObjectId,
		});

		if (existing) {
			return sendError(res, 'Teacher already exists in this school!', 400);
		}

		// Use ObjectId for all queries
		const subjNames = await Subject.find({
			name: { $in: subjects },
			school: schoolObjectId,
		});

		const subjIds = subjNames.map((s) => s._id);

		// Find all class IDs for the provided class names
		const classes = await ClassData.find({
			name: { $in: classesNames },
			school: schoolObjectId,
		});

		if (classes.length !== classesNames.length) {
			const foundClassNames = classes.map((c) => c.name);
			const missingClasses = classesNames.filter((name) => !foundClassNames.includes(name));
			return sendError(res, `These classes don't exist: ${missingClasses.join(', ')}`, 400);
		}

		const classIds = classes.map((c) => c._id);

		// Create teacher with class IDs
		const createdTeacher = await ListOfTechers.create({
			name: name.trim(),
			classes: classIds,
			school: schoolObjectId, // Use ObjectId here too
			subjects: subjIds,
		});

		return sendSucess(res, 'Successfully created teacher!', createdTeacher, 201);
	} catch (error) {
		console.error(error);
		if (error.code === 11000) {
			return sendError(res, 'Teacher with this name already exists', 400);
		}
		sendError(res, error.message);
	}
};

//done

export const genTimetableHandler = async (req, res) => {
	try {
		// const { schoolId } = req.params;

		//lets send the timetable id to the users email

		const { name, config } = req.body;
		const userId = req.userId;

		if (!name) {
			return sendError(res, 'Name value is required !');
		}

		if (!userId) {
			return sendError(res, 'User  not authenticated !', 401);
		}

		const user = await User.findById(userId).populate('school');

		const schoolId = user.school._id; //problem is over here !

		await sendIdMail(schoolId);
		//check if the user is associated with any school at first !
		if (!schoolId) {
			return sendError(res, 'User is not associated with any school!', 400);
		}

		// Generate timetable data
		const timetables = await generateSimpleTimetable(schoolId, config);

		// Create the timetable document
		const timetable = await GenTable.create({
			name: name,
			school: schoolId,
			timetables,
			config,
			constraints: {},
			createdBy: userId,
		});

		// Update the creator (admin/teacher who generated the timetable)
		await User.findByIdAndUpdate(userId, { $push: { timetables: timetable._id } }, { new: true });

		return sendSucess(res, 'Timetable generated and saved to the database !', timetable, 201);
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

//if the timetable is not what was expected then i want the user to be able to delete it
export const deleteTable = async (req, res) => {
	try {
		const { timetableId } = req.params;
		const deletedTimetable = await GenTable.findOneAndDelete({ _id: timetableId });
		sendSucess(res, 'Deleted the timetable', deletedTimetable, 200);
	} catch (error) {
		sendError(res, error.message, 500);
	}
};

//now for getting the timetable after it has been generated !
//to make sure that the timetable that is being shown is for the user that is already verified and has an account
export const getTimetable = async (req, res) => {
	const { timetableId } = req.params;
	try {
		const user = await User.findById(req.userId);
		if (!user) {
			return sendError(res, 'User not found', 404);
		}
		const timetable = await GenTable.findOne({
			_id: timetableId,
			// $or: [
			// 	{ createdBy: req.userId }, // Owner check
			// 	{ school: user.school }, // School-wide access
			// ],
		});

		if (!timetable) {
			return sendError(res, 'No timetables found !', 404);
		}

		sendSucess(res, 'Here is the timetable', timetable, 200);
	} catch (error) {
		console.log(error);

		sendError(res, error.message);
	}
};
