//here is where we will send the email

import {from, resend} from "./config.js";
import {
  demoMailPlate,
  schoolIdPLate,
  verifMailPlate,
  welcomeMailPlate,
} from "./mailTemplate.js";

const send = async (message) => {
  if (!resend) {
    throw new Error("Configure RESEND_API_KEY (or RESEND_KEY) to send email.");
  }
  if (!from) {
    throw new Error(
      "Configure RESEND_FROM_EMAIL with an address on a verified Resend domain.",
    );
  }

  const {data, error} = await resend.emails.send({from, ...message});
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
  if (!data) {
    throw new Error("Resend did not return a successful email result.");
  }
  return data;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export const sendVerMail = async (verToken, email) => {
  return send({
    to: [email],
    subject: "Verify your email!",
    html: verifMailPlate.replace("{verToken}", escapeHtml(verToken)),
  });
};

export const senWelMail = async (email, firstName) => {
  return send({
    to: [email],
    subject: "Welcome to Timetable",
    html: welcomeMailPlate.replace("{firstName}", escapeHtml(firstName)),
  });
};

export const sendDemoMail = async (fullName, email, schName, date, time) => {
  const emailContent = demoMailPlate
    .replace(/{fullName}/g, escapeHtml(fullName))
    .replace(/{email}/g, escapeHtml(email))
    .replace(/{schoolName}/g, escapeHtml(schName))
    .replace(/{date}/g, escapeHtml(date))
    .replace(/{time}/g, escapeHtml(time));

  const notificationEmail =
    process.env.DEMO_NOTIFICATION_EMAIL || "allankirimi65@gmail.com";

  const [notification, confirmation] = await Promise.all([
    send({
      to: [notificationEmail],
      replyTo: email,
      subject: `Demo Request from ${String(fullName).trim()}`,
      html: emailContent,
    }),
    send({
      to: [email],
      subject: "We received your demo request",
      text: `Hi ${String(fullName).trim()},\n\nThanks for requesting a Timetable demo for ${String(schName).trim()}. We have received your request for ${String(date).trim()} at ${String(time).trim()} and will contact you shortly.\n\nThe Timetable team`,
    }),
  ]);

  return {notification, confirmation};
};

export const sendIdMail = async (schoolId, email) => {
  return send({
    to: [email],
    subject: "Here is your school ID",
    html: schoolIdPLate(schoolId),
  });
};
