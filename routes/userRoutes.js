import { Router } from 'express';
import { createTeacher } from '../controllers/userController.js';

export const userRouter = Router();

userRouter.post('/create-account', createTeacher);
