//here we will connect with resend to be able to send emails to the user after successfull signIn or login
import 'dotenv/config';
import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
const from =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? null
    : "Timetable <onboarding@resend.dev>");
const resend = key ? new Resend(key) : null;

if (!key) {
  console.error(
    "[email] Resend API key is missing; outbound emails are disabled. Set RESEND_API_KEY.",
  );
} else if (!from) {
  console.error(
    "[email] RESEND_FROM_EMAIL is missing; set it to an address on a verified Resend domain.",
  );
} else if (from.includes("onboarding@resend.dev")) {
  console.warn(
    "[email] Using Resend's test sender. It can only deliver to the email address associated with your Resend account; configure RESEND_FROM_EMAIL for other recipients.",
  );
}

export { from, resend };
