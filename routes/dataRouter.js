import { Router } from 'express';
import {
	genTimetableHandler,
	listClassData,
	listSchool,
	listSubjects,
	listTeachers,
} from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers/:schoolId', listTeachers);
dataRouter.post('/list-subjects/:schoolId', listSubjects);
dataRouter.post('/list-classData/:schoolId', listClassData);
dataRouter.post('/gen-table/:schoolId', genTimetableHandler);
dataRouter.post('/list-school', listSchool);

export { dataRouter };
