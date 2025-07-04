import express from 'express';
import 'dotenv/config';
import { connectDb } from './database/config.js';
import { router } from './routes/userRoutes.js';
import { lessonRouter } from './routes/lessonsRoute.js';
import { dataRouter } from './routes/dataRouter.js';

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use('/api/check', lessonRouter);
app.use('/api', router, dataRouter);
//middleware for checking overlaps

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
