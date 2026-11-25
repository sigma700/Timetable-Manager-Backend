# Email setup and testing

Transactional emails are sent through Resend. The API accepts a message for
delivery; it does not guarantee that a recipient's mailbox will place it in
the inbox.

## Local testing

Add a Resend API key to the server's `.env` file:

```dotenv
RESEND_API_KEY=re_...
EMAIL_TEST_TO=the-email-address-on-your-Resend-account
```

`RESEND_KEY` is also accepted for compatibility with existing local
configurations. Without `RESEND_FROM_EMAIL`, non-production runs use
`Timetable <onboarding@resend.dev>`. Resend only permits this test sender to
deliver to the email address associated with your Resend account. To test
delivery to other addresses from localhost, verify a domain in Resend and set
`RESEND_FROM_EMAIL` to an address on that domain. The server logs a warning
when it is using the restricted test sender.

Send a real test message through the same email helper used by the application:

```powershell
npm run test:email -- your-resend-account-email@example.com
```

You can omit the address when `EMAIL_TEST_TO` is set. The command prints the
Resend message ID on acceptance and exits unsuccessfully with the provider
error if sending fails. For local signup verification, check the server
console: if sending fails, the error is logged and the verification code is
also logged in non-production mode.

## Deployment

Configure these as environment variables in the deployment platform (do not
commit API keys):

```dotenv
NODE_ENV=production
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Timetable <no-reply@your-verified-domain.example>"
```

Verify the sender domain in Resend and publish the DNS records it provides
before using it. `RESEND_FROM_EMAIL` must use an address on that verified
domain. The test sender `onboarding@resend.dev` is not a production sender.
After configuring the deployment, run the same email test command in its shell
with a recipient you control. Check the server logs for any runtime delivery
errors; a successful API response means Resend accepted the message, not that
the recipient's provider delivered it to the inbox.

The server logs a clear configuration error when the production API key or
sender address is missing. This does not stop the server from starting, but
email sending will fail until both variables are set.
