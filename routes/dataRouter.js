import { Router } from 'express';
import { listClassData, listSubjects, listTeachers } from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers', listTeachers);
dataRouter.post('/list-subjects', listSubjects);
dataRouter.post('/list-classData', listClassData);

export { dataRouter };
