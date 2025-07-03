//here is where we perform all the logical for designing all the endpoints

import { Teacher } from '../database/model/users.js';
import bcrypt from 'bcrypt';
import { genJwTok } from '../utils/genJwToken.js';
import { generateToken } from '../utils/genToken.js';
import passport from 'passport';

export const createTeacher = async (req, res) => {
	//lets enumerate the sign up
	const { firstName, lastName, password, email, school, contacts } = req.body;
	try {
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Please fill out all the required fileds !',
			});
		}

		const exists = await Teacher.findOne({ email: email });
		//created this so as to remove the number of fetch requests in the application
		if (exists) {
			const isPassValid = await bcrypt.compare(password, exists.password);
			if (!isPassValid) {
				return res.status(401).json({
					success: false,
					message: 'Incorrect user password !',
				});
			}
			genJwTok(res, exists._id);
			res.status(200).json({
				success: true,
				message: 'Successfully logged in !',
			});

			return res.status(400).json({
				success: false,
				message: 'The user already exists try logging in instead !',
			});
		} else {
			const hashedPass = await bcrypt.hash(password, 12);
			const verToken = generateToken();

			//creation of the user
			const teacher = await Teacher.create({
				firstName,
				lastName,
				email,
				password: hashedPass,
				school,
				verToken,
				contacts,
			});

			//set headers
			genJwTok(res, teacher._id);

			//send response
			res.status(200).json({
				success: true,
				message: 'Success !',
				data: teacher,
			});
		}

		//lets hash the passwords
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Could not create the teacher as requested !',
		});
		console.log(error);
	}
};

//authentication using passport js

export const loginTeacher = (req, res, next) => {
	passport.authenticate('local', (err, teacher, info) => {
		if (err) return next(err);
		if (!teacher) {
			return res.status(401).json({
				success: false,
				message: 'Invalid email or password !',
			});
		}

		//login successful
		req.logIn(teacher, (err) => {
			if (err) return next(err);
			genJwTok(res, teacher._id);

			return res.status(200).json({
				success: true,
				message: 'Successful login in!',
				user: {
					_id: teacher._id,
					email: teacher.email,
				},
			});
		});
	})(req, res, next);
};
