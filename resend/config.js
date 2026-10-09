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

export { from, resend };
