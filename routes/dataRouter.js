import { Router } from 'express';
import {
	listClassData,
	listSchool,
	listSubjects,
	listTeachers,
} from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers/:schoolId', listTeachers);
dataRouter.post('/list-subjects/:schoolId', listSubjects);
dataRouter.post('/list-classData', listClassData);
dataRouter.post('/list-school', listSchool);

export { dataRouter };
