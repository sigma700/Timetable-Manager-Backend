//here is where we will send the email

import { resend } from './config.js';
//email for account verification after the user has set up an account !
export const sendVerMail = async (email, verToken) => {
	try {
		const { data, error } = await resend.emails.send({
			from: 'Acme <onboarding@resend.dev>',
			to: ['allankirimi65@gmail.com'], //set it to mine before production but after that i will add the feature such that the actual user is the one who will get the legit email
			subject: 'Welcome to my application !',
			html: '<strong>Nice one here is the email</strong>',
		});
	} catch (error) {
		console.log(error);

		console.log('An error occured with sending the email !', error);
	}
};
