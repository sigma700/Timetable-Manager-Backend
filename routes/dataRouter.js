import { Router } from 'express';
import { listTeachers } from '../controllers/adminController.js';

const dataRouter = Router();

dataRouter.post('/list-teachers', listTeachers);

export { dataRouter };
