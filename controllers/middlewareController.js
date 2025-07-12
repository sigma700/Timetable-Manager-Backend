import { use } from 'react';
import { User } from '../database/model/users.js';
import { sendError, sendSucess } from '../utils/sendError.js';

//here we will check the users security
export const checkAuth = async (req, res) => {
	try {
		console.log('req.userId', req.userId);

		const user = await User.findById(req.userId);
		if (!user) {
			return sendError(res, 'User not found', 401);
		}

		// Remove password before sending user data
		const { password, ...userData } = user._doc;
		sendSucess(res, userData, 'Authenticated user!', 200);
	} catch (error) {
		console.log(error);
		sendError(res, error.message, 500);
	}
};
