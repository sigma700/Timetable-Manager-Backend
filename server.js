import express from 'express';
const app = express();
import 'dotenv/config';
import { connectDb } from './database/config.js';
import { userRouter } from './routes/userRoutes.js';
import passport from 'passport';

const port = process.env.PORT;

app.use(express.json());
app.use('/api', userRouter);
app.use(passport.initialize());
app.use(passport.session());
connectDb();

app.get('/', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'Here is the basic route for overall testing!',
	});
});

app.listen(port, () => {
	console.log(`Server is listening on : http://localhost:${port}`);
});
