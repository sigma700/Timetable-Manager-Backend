//checking users decoded cookie

import { sendError, sendSucess } from '../utils/sendError.js';
import jwt from 'jsonwebtoken';
export const checkAuthentication = async (req, res, next) => {
	const { token } = req.cookies;

	if (!token) {
		sendError(res, 'Are you logged in yet ?', 401); //here there is a problem !
		return;
	}

	try {
		const decodedToken = jwt.verify(token, process.env.WEBTOKEN);
		if (!decodedToken) {
			sendError(res, 'Failed could not decode the token !', 500);
		}

		sendSucess(res, 'Sucess !', decodedToken, 200);

		req.userId = decodedToken.userId;
		next(); //gives the logic to any of the related functions
	} catch (error) {
		console.log(error);

		sendError(res, error.message);
	}
};
