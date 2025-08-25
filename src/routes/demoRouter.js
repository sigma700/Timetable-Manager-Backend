import { Router } from 'express';
import { getDemo } from '../controllers/secondary.js';

const demoRoute = Router();

demoRoute.post('/bookDemo', getDemo);

export { demoRoute };
