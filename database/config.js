//making connection to the database
import mongoose from 'mongoose';
import 'dotenv/config';

export const connectDb = async () => {
	try {
		const connection = await mongoose.connect(process.env.MONGO_URL);
		if (!connection) {
			return console.log('Unable to establish connection with the database');
		}
		console.log('Connection to the database was established !');
	} catch (error) {
		console.log(error.message);
	}
};
