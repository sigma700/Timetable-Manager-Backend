//here is where we will send the email

import {resend} from "./config.js";
import {
  demoMailPlate,
  schoolIdPLate,
  verifMailPlate,
  welcomeMailPlate,
} from "./mailTemplate.js";
//email for account verification after the user has set up an account !
// export const sendVerMail = async (verToken, email) => {
// 	try {
// 		const { data, error } = await resend.emails.send({
// 			from: 'Acme <onboarding@resend.dev>',
// 			to: [email],
// 			subject: 'Verify your email!',
// 			html: verifMailPlate.replace('{verToken}', verToken),
// 		});

// 		console.log(`Sending the email to ${email}`);

// 		if (error) {
// 			console.error('Resend API error:', error);
// 			throw new Error(`Failed to send email: ${error.message}`);
// 		}

// 		console.log(`Email sent successfully to ${email}`, data);
// 		return data;
// 	} catch (error) {
// 		console.error('Error sending verification email:', error);
// 		throw error; // Re-throw to let the caller handle it
// 	}
// };

export const senWelMail = async (email, firstName) => {
  try {
    const {data, error} = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["allankirimi65@gmail.com"],
      subject: "Welcome to EduFind",
      html: welcomeMailPlate.replace("{firstName}", firstName),
    });
  } catch (error) {
    console.log("Error sending verification error", error);
  }
};
export const sendDemoMail = async (fullName, email, schName, date, time) => {
  try {
    const emailContent = demoMailPlate
      .replace(/{fullName}/g, fullName)
      .replace(/{email}/g, email)
      .replace(/{schoolName}/g, schName)
      .replace(/{date}/g, date)
      .replace(/{time}/g, time);

    const {data, error} = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["allankirimi65@gmail.com"],
      subject: `Demo Request from ${fullName}`,
      html: emailContent,
    });

    if (error) {
      console.error("Resend error:", error);
    }

    //thid is the
    console.log("Demo email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending demo email:", error);
    throw error;
  }
};

export const sendIdMail = async (schoolId) => {
  try {
    const {data, error} = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["allankirimi65@gmail.com"], // set it to mine before production but after that i will add the feature such that the actual user is the one who will get the legit email
      subject: "Here is your schoolId",

      html: schoolIdPLate(schoolId),
    });

    // Resend's SDK resolves with { data, error } on API-level failures —
    // it does NOT throw for those. The original code destructured `error`
    // and never checked it, so a bad API key, invalid recipient, etc.
    // would silently do nothing and report success.
    if (error) {
      console.error("Resend API error sending schoolId email:", error);
      return {sent: false, error};
    }

    return {sent: true, data};
  } catch (err) {
    console.error("An error occurred with sending the email!", err);
    return {sent: false, error: err};
  }
};
