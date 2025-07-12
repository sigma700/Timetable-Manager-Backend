import { Router } from 'express';
import { createTeacher, veriAcc } from '../controllers/userController.js';

import { checkAuth } from '../controllers/middlewareController.js';

export const router = Router();

router.get('check', checkAuth);
router.post('/create-account', checkAuth, createTeacher);
router.post('/verify', veriAcc);
