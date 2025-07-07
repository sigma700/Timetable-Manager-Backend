import { Router } from 'express';
import {
	genTable,
	listClassData,
	listSchool,
	listSubjects,
	listTeachers,
} from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers/:schoolId', listTeachers);
dataRouter.post('/list-subjects/:schoolId', listSubjects);
dataRouter.post('/list-classData/:schoolId', listClassData);
dataRouter.post('/gen-table/:schoolId', genTable);
dataRouter.post('/list-school', listSchool);

export { dataRouter };
