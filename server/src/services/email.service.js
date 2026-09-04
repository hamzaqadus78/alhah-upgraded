/**
 * Email delivery via Brevo's HTTP API (not SMTP) — Render's free tier
 * permanently blocks outbound SMTP ports (25/465/587) as of Sept 2025 to
 * fight spam abuse, so Gmail SMTP (nodemailer) times out from there
 * regardless of how correct the credentials are. Brevo sends over normal
 * HTTPS, which is never blocked.
 *
 * Set BREVO_API_KEY and EMAIL_SENDER in server/.env (EMAIL_SENDER must be
 * a Brevo-verified sender address). Until both are set, sendContactEmail
 * throws a clear "not configured" error instead of silently failing.
 */
const { BrevoClient } = require('@getbrevo/brevo');

const configured = () =>
  !!process.env.BREVO_API_KEY && !!process.env.EMAIL_SENDER;

let client = null;
function getClient() {
  if (!client) {
    client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  }
  return client;
}

/**
 * @param {{name: string, email: string, phone?: string, subject?: string, message: string}} payload
 */
async function sendContactEmail(payload) {
  if (!configured()) {
    const err = new Error(
      'Contact email is not configured — set BREVO_API_KEY / EMAIL_SENDER in server/.env (see .env.example).'
    );
    err.status = 503;
    err.publicMessage = 'Sorry, the contact form is temporarily unavailable — please email or WhatsApp us directly.';
    throw err;
  }

  const { name, email, phone, subject, message } = payload;
  const to = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_SENDER;

  await getClient().transactionalEmails.sendTransacEmail({
    sender: { name: 'ALHAH INDUSTRIES Website', email: process.env.EMAIL_SENDER },
    to: [{ email: to }],
    replyTo: { email, name },
    subject: subject ? `[Contact] ${subject}` : `New contact form message from ${name}`,
    textContent: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || 'Not provided'}`,
      '',
      message,
    ].join('\n'),
  });
}

/**
 * Notifies the admin (CONTACT_RECEIVER_EMAIL) whenever a new order is
 * placed. Silently does nothing if email isn't configured yet — checking
 * the admin dashboard's Orders tab always works regardless, this is just
 * a convenience on top of that, so it must never block order creation.
 */
async function sendOrderPlacedEmail(order) {
  if (!configured()) return;

  const { formatOrderNumber } = require('./../lib/orderNumber');
  const to = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_SENDER;
  const total = ((order.totalCents || 0) / 100).toFixed(2);

  await getClient().transactionalEmails.sendTransacEmail({
    sender: { name: 'ALHAH INDUSTRIES Website', email: process.env.EMAIL_SENDER },
    to: [{ email: to }],
    subject: `New order ${formatOrderNumber(order.orderSeq)} — ${order.customerName}`,
    textContent: [
      `Order: ${formatOrderNumber(order.orderSeq)}`,
      `Customer: ${order.customerName} (${order.customerEmail})`,
      order.customerPhone ? `Phone: ${order.customerPhone}` : null,
      `Total: ${order.currency} ${total}`,
      '',
      'View and manage this order in the admin dashboard.',
    ].filter(Boolean).join('\n'),
  });
}

/**
 * Signup email verification — account exists but can't log in until this
 * link is clicked (see auth.controller.js). Not wrapped in a configured()
 * silent-skip like the notification emails below, since without this the
 * account would be permanently unusable — signup itself must fail loudly
 * if email isn't configured, same as the contact form.
 */
async function sendSignupVerificationEmail(to, name, link) {
  if (!configured()) {
    const err = new Error('Email is not configured — set BREVO_API_KEY / EMAIL_SENDER in server/.env.');
    err.status = 503;
    err.publicMessage = 'Sorry, account signup is temporarily unavailable — please try again later or contact us directly.';
    throw err;
  }

  await getClient().transactionalEmails.sendTransacEmail({
    sender: { name: 'ALHAH INDUSTRIES', email: process.env.EMAIL_SENDER },
    to: [{ email: to, name }],
    subject: 'Confirm your email — ALHAH INDUSTRIES',
    textContent: [
      `Hi ${name},`,
      '',
      'Click the link below to confirm your email and activate your account:',
      link,
      '',
      "If you didn't create this account, you can ignore this email.",
      'This link expires in 24 hours.',
    ].join('\n'),
  });
}

/**
 * Checkout order confirmation — nothing is saved to the database until
 * this link is clicked and confirmed (see order.service.js's
 * beginCheckout). Same reasoning as above: must fail loudly, not silently
 * skip, since without it the customer would have no way to complete
 * their order at all.
 */
async function sendCheckoutVerificationEmail(to, name, link, itemsSummary) {
  if (!configured()) {
    const err = new Error('Email is not configured — set BREVO_API_KEY / EMAIL_SENDER in server/.env.');
    err.status = 503;
    err.publicMessage = 'Sorry, checkout is temporarily unavailable — please try again later or contact us directly.';
    throw err;
  }

  await getClient().transactionalEmails.sendTransacEmail({
    sender: { name: 'ALHAH INDUSTRIES', email: process.env.EMAIL_SENDER },
    to: [{ email: to, name }],
    subject: 'Confirm your order — ALHAH INDUSTRIES',
    textContent: [
      `Hi ${name},`,
      '',
      'Please confirm your order:',
      itemsSummary,
      '',
      'Click the link below to confirm and complete your order:',
      link,
      '',
      "If you didn't request this, you can safely ignore this email — nothing has been ordered yet.",
      'This link expires in 30 minutes.',
    ].join('\n'),
  });
}

module.exports = {
  sendContactEmail,
  sendOrderPlacedEmail,
  sendSignupVerificationEmail,
  sendCheckoutVerificationEmail,
  configured,
};
