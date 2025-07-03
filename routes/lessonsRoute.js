import { Router } from 'express';
import { createLesson } from '../controllers/lessonsController.js';

export const lessonRouter = Router();

lessonRouter.post('/checkOverlap', createLesson);
