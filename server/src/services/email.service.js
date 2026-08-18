/**
 * Contact-form email delivery via Gmail SMTP (Nodemailer).
 *
 * Requires a Gmail App Password (not the account password) — Gmail accounts
 * with 2FA enabled can generate one at https://myaccount.google.com/apppasswords.
 * Set GMAIL_USER / GMAIL_APP_PASSWORD in server/.env. Until both are set,
 * sendContactEmail throws a clear "not configured" error instead of
 * silently failing.
 */
const nodemailer = require('nodemailer');

const configured = () =>
  !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

/**
 * @param {{name: string, email: string, phone?: string, subject?: string, message: string}} payload
 */
async function sendContactEmail(payload) {
  if (!configured()) {
    const err = new Error(
      'Contact email is not configured — set GMAIL_USER / GMAIL_APP_PASSWORD in server/.env (see .env.example).'
    );
    err.status = 503;
    err.publicMessage = 'Sorry, the contact form is temporarily unavailable — please email or WhatsApp us directly.';
    throw err;
  }

  const { name, email, phone, subject, message } = payload;
  const to = process.env.CONTACT_RECEIVER_EMAIL || process.env.GMAIL_USER;

  await getTransporter().sendMail({
    from: `"ALHAH INDUSTRIES Website" <${process.env.GMAIL_USER}>`,
    to,
    replyTo: email,
    subject: subject ? `[Contact] ${subject}` : `New contact form message from ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || 'Not provided'}`,
      '',
      message,
    ].join('\n'),
  });
}

module.exports = { sendContactEmail, configured };
