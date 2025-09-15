import { Router } from 'express';
import {
	deleteTable,
	genTimetableHandler,
	getTimetable,
	listClassData,
	listSchool,
	listSubjects,
	listTeachers,
	updateTimetable,
} from '../controllers/adminController.js';
import { verifyToken } from '../../middleware/checkToken.js';

const dataRouter = Router();

dataRouter.post('/list-school', verifyToken, listSchool);
dataRouter.post('/list-subjects', verifyToken, listSubjects);
dataRouter.post('/list-classData', verifyToken, listClassData);
dataRouter.post('/list-teachers', verifyToken, listTeachers);
dataRouter.put('/updateTable/:timetableId', updateTimetable);
dataRouter.delete('/delTable/:timetableId', deleteTable);
//now to get all the data about the timetable that has been gerenrated !
dataRouter.get('/getTable/:timetableId', verifyToken, getTimetable);
dataRouter.post('/gen-table', verifyToken, genTimetableHandler);
// dataRouter.post('/list-school', listSchool);

export { dataRouter };
