import express from 'express';
import 'dotenv/config';
import { connectDb } from './database/config.js';
import { router } from './routes/userRoutes.js';

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use('/api', router);
//middleware for checking overlaps
app.use('/api/check');

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
