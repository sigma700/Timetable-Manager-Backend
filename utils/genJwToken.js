import jwt from 'jsonwebtoken';

export const genJwTok = (res, userId) => {
	const token = jwt.sign({ userId }, process.env.WEBTOKEN, {
		expiresIn: '7d',
	});

	res.cookie('token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	return token;
};
