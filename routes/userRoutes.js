import { Router } from 'express';
import { createTeacher, veriAcc } from '../controllers/userController.js';

export const router = Router();

router.post('/create-account', createTeacher);
router.post('/verify', veriAcc);
