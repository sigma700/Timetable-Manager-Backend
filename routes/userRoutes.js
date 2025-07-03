import { Router } from 'express';
import { createTeacher } from '../controllers/userController.js';

export const router = Router();

router.post('/create-account', createTeacher);
