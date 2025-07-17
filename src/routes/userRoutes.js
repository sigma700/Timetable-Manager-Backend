import { Router } from 'express';
import { createTeacher, veriAcc } from '../controllers/userController.js';

import { checkAuth } from '../controllers/middlewareController.js';

export const router = Router();
router.post('/create-account/:school', createTeacher);
router.post('/verify', veriAcc);
router.get('check', checkAuth);
