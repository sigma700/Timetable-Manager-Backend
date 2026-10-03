import { Router } from 'express';
import { getSettings, saveSettings, patchSetting } from '../controllers/settingsController.js';
import { verifyToken } from '../../middleware/checkToken.js';

const settingsRouter = Router();

settingsRouter.get('/settings',   verifyToken, getSettings);
settingsRouter.put('/settings',   verifyToken, saveSettings);
settingsRouter.patch('/settings', verifyToken, patchSetting);

export { settingsRouter };