import { Router } from 'express';
import {
	deleteTable,
	genTimetableHandler,
	listClassData,
	listSchool,
	listSubjects,
	listTeachers,
	updateTimetable,
} from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers/:schoolId', listTeachers);
dataRouter.post('/list-subjects/:schoolId', listSubjects);
dataRouter.post('/list-classData/:schoolId', listClassData);
dataRouter.post('/gen-table/:schoolId', genTimetableHandler);
dataRouter.put('/updateTable/:timetableId', updateTimetable);
dataRouter.delete('/delTable/:timetableId', deleteTable);
dataRouter.post('/list-school', listSchool);

export { dataRouter };
