import passport from 'passport';
import { Teacher } from '../database/model/users.js';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

passport.use(
	new LocalStrategy({ userNameField: 'email' }, async (email, password, done) => {
		try {
			const teacher = await Teacher.findOne({ email });
			if (!teacher) {
				return done(null, false);
			}

			const isMatch = await bcrypt.compare(password, teacher.password);
			if (!isMatch) {
				return done(null, false);
			}

			return done(null, teacher);
		} catch (error) {
			return done(error);
		}
	})
);
