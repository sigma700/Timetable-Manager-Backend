import { use } from 'react';
import { User } from '../database/model/users.js';
import { sendError, sendSucess } from '../../utils/sendError.js';

//here we will check the users security
export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId);
		if (!user) {
			return sendError(res, 'User not found!', 401);
		}
		//after user is found then lets populate the user to show the timetable that is created by the user

		sendSucess(res, 'Sucess', user, 200);
	} catch (error) {
		console.log(error);
		sendError(res, error.message);
	}
};
