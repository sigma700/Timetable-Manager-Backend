import { Router } from 'express';
import { createTeacher, login, veriAcc } from '../controllers/userController.js';

import { checkAuth } from '../controllers/middlewareController.js';
import { verifyToken } from '../../middleware/checkToken.js';

export const router = Router();
router.post('/create-account', createTeacher);
router.post('/login/:school', login);
router.post('/verify', veriAcc);
router.get('/check-Auth', verifyToken, checkAuth);
