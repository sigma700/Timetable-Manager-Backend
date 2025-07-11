//here we will connect with resend to be able to send emails to the user after successfull signIn or login
import 'dotenv/config';
import { Resend } from 'resend';

const key = process.env.RESEND_KEY;

const resend = new Resend(key);

console.log('Resdend was connected successfully !');

if (!resend) {
	console.log('Resend could not be connected !');
}

export { resend };
