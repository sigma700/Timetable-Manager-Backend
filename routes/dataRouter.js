import { Router } from 'express';
import { listSubjects, listTeachers } from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers', listTeachers);
dataRouter.post('/list-subjects', listSubjects);

export { dataRouter };
