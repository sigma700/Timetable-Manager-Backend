import "dotenv/config";
import {senWelMail} from "../resend/sendEmail.js";

const recipient = process.argv[2] || process.env.EMAIL_TEST_TO;

if (!recipient) {
  console.error(
    "Usage: npm run test:email -- <recipient-address> (or set EMAIL_TEST_TO)",
  );
  process.exitCode = 1;
} else {
  try {
    const result = await senWelMail(recipient, "Email delivery test");
    console.log(`Email accepted by Resend. Message ID: ${result.id}`);
  } catch (error) {
    console.error(`Email test failed: ${error.message}`);
    process.exitCode = 1;
  }
}
