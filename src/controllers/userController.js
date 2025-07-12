//here is where we perform all the logical for designing all the endpoints

import { User } from '../database/model/users.js';
import bcrypt from 'bcrypt';
import { genJwTok } from '../../utils/genJwToken.js';
import { generateToken } from '../../utils/genToken.js';
import { School } from '../database/model/school.js';
import { sendError, sendSucess } from '../../utils/sendError.js';
import { sendVerMail, senWelMail } from '../../resend/sendEmail.js';

export const createTeacher = async (req, res) => {
	//lets enumerate the sign up
	const { firstName, lastName, password, email, school, contacts } = req.body;
	try {
		if (!email || !password) {
			return sendError(res, 'Please fill out the required areas !');
		}

		//lets populate the school variable so as to be able to access the school name rather than just the school ObjectId

		const populatedSchool = await School.findById({ _id: school }).populate('name');

		const exists = await User.findOne({ email: email });
		//created this so as to remove the number of fetch requests in the application
		if (exists) {
			const isPassValid = await bcrypt.compare(password, exists.password);
			if (!isPassValid) {
				return sendError(res, 'Password is incorrect !', 401);
			}
			genJwTok(res, exists._id);

			return sendSucess(res, 'Successfully loged in !', exists, 201);
		} else {
			const hashedPass = await bcrypt.hash(password, 12);
			const verToken = generateToken();

			//creation of the user
			const teacher = await User.create({
				firstName,
				lastName,
				email,
				password: hashedPass,
				school: populatedSchool,
				verToken,
				verTokenExpDate: Date.now() + 24 * 60 * 1000,
				contacts,
			});

			//set headers
			genJwTok(res, teacher._id);
			//lets send the email containing the cerification token that is required
			await sendVerMail(teacher.verToken);

			//send response

			sendSucess(res, 'Successfully created new user !', teacher, 201);
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
		console.log(error);
	}
};

//lets add a verification area for more enhanced security

export const veriAcc = async (req, res) => {
	const { code } = req.body; //lets get the code from the user inputs

	try {
		//lets check if the person actually has the account

		const isExisting = await User.findOne({
			verToken: code,
			verTokenExpDate: { $gt: Date.now() },
		});
		if (!isExisting) {
			return sendError(res, 'Code might be wrong or already expired !', 401);
		}

		//assignment
		isExisting.isVerified = true;
		isExisting.verToken = undefined; //token to dissapear for safety
		isExisting.verTokenExpDate = undefined; //date to also dissapear lol

		//save to the db

		await isExisting.save();

		//TODO: Send a welcome email to the user after successfull verification here
		await senWelMail(isExisting.email, isExisting.firstName);

		sendSucess(res, 'Verified !', isExisting, 200);
	} catch (error) {
		console.log(error); //i always add this for easier debugging of the code !
		sendError(res, error.message);
	}
};
