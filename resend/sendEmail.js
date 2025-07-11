//here is where we will send the email

import { resend } from './config.js';
import { verifMailPlate, welcomeMailPlate } from './mailTemplate.js';
//email for account verification after the user has set up an account !
export const sendVerMail = async (verToken) => {
	try {
		const { data, error } = await resend.emails.send({
			from: 'Acme <onboarding@resend.dev>',
			to: ['allankirimi65@gmail.com'], //set it to mine before production but after that i will add the feature such that the actual user is the one who will get the legit email
			subject: 'Verify your email !',
			html: verifMailPlate.replace('{verToken}', verToken),
		});
	} catch (error) {
		console.log(error);

		console.log('An error occured with sending the email !', error);
	}
};

export const senWelMail = async (email, firstName) => {
	try {
		const { data, error } = await resend.emails.send({
			from: 'Acme <onboarding@resend.dev>',
			to: ['allankirimi65@gmail.com'],
			subject: 'Welcome to EduFind',
			html: welcomeMailPlate.replace('{firstName}', firstName),
		});
	} catch (error) {
		console.log('Error sending verification error', error);
	}
};
