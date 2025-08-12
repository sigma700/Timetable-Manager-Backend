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

dataRouter.post('/list-teachers/:schoolId', listTeachers);
dataRouter.post('/list-subjects/:schoolId', listSubjects);
dataRouter.post('/list-classData/:schoolId', listClassData);
dataRouter.post('/gen-table/:schoolId', verifyToken, genTimetableHandler);
dataRouter.put('/updateTable/:timetableId', updateTimetable);
dataRouter.delete('/delTable/:timetableId', deleteTable);
//now to get all the data about the timetable that has been gerenrated !
dataRouter.get('/getTable/:timetableId/:name', verifyToken, getTimetable);
dataRouter.post('/list-school', listSchool);

export { dataRouter };
