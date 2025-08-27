//here i want the code for making the demo booking algorithm
//i want to just get the email for the booking of the timetable

import { sendDemoMail } from '../../resend/sendEmail.js';
import { sendError, sendSucess } from '../../utils/sendError.js';
import { Demo } from '../database/model/demos.js';

const getDemo = async (req, res) => {
	const { fullName, email, schName, date, time } = req.body;
	try {
		//now lets just create the demo into the database
		if (!fullName || !email || !schName || !time || !date) {
			return sendError(res, 'Please fill out the required fields', 400);
		}
		const createdDemo = await Demo.create({
			fullName: fullName,
			email: email,
			schoolName: schName,
			date: date,
			time: time,
		});

		sendDemoMail(fullName, email, schName, date, time);

		sendSucess(res, 'Demo was created !', createdDemo, 200);
	} catch (error) {
		sendError(res, error.message);
	}
};

export { getDemo };
