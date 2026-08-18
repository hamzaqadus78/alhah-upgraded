/**
 * Payoneer Checkout integration — STUB.
 *
 * Payoneer's exact Checkout API endpoints, request/response field names, and
 * webhook signature scheme are NOT finalized here — they can only be nailed
 * down once a real Payoneer business account with Checkout approval and
 * sandbox credentials exist (see plan Part B10, item 2). This module is the
 * single place that knowledge lives; nothing else in the app (routes,
 * controllers, DB writes, frontend) should need to change once it's filled
 * in for real — they only ever call the three functions exported below.
 *
 * Until real credentials are configured, every call throws a clear "not
 * configured" error rather than silently pretending to succeed.
 */

const configured = () =>
  process.env.PAYONEER_API_KEY &&
  process.env.PAYONEER_API_KEY !== '' &&
  process.env.PAYONEER_API_SECRET &&
  process.env.PAYONEER_API_SECRET !== '';

function assertConfigured() {
  if (!configured()) {
    const err = new Error(
      'Payoneer Checkout is not configured yet — set PAYONEER_API_KEY / PAYONEER_API_SECRET / PAYONEER_WEBHOOK_SECRET in server/.env once a Payoneer business account with Checkout approval is available.'
    );
    err.status = 503;
    err.publicMessage = 'Online payment is not available yet — please contact us directly.';
    throw err;
  }
}

/**
 * Creates a hosted checkout session for the given order and returns the
 * URL the customer's browser should be redirected to.
 *
 * TODO (blocked on real Payoneer sandbox docs/credentials): replace this
 * body with an actual call to Payoneer's Checkout session-creation
 * endpoint, passing order.totalCents/currency/id and a return URL of
 * `${FRONTEND_BASE}/order-confirmation.html?order=${order.id}`.
 *
 * @param {{id: string, totalCents: number, currency: string}} order
 * @returns {Promise<{ redirectUrl: string, sessionId: string }>}
 */
async function createCheckoutSession(order) {
  assertConfigured();
  throw new Error('createCheckoutSession: Payoneer API call not yet implemented — see TODO above.');
}

/**
 * Verifies an inbound webhook request actually came from Payoneer before
 * trusting its payload to mark an order PAID.
 *
 * TODO (blocked on real Payoneer docs): implement per Payoneer's documented
 * webhook signature scheme (commonly an HMAC over the raw request body
 * using PAYONEER_WEBHOOK_SECRET, compared against a signature header).
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function verifyWebhookSignature(req) {
  assertConfigured();
  throw new Error('verifyWebhookSignature: Payoneer signature verification not yet implemented — see TODO above.');
}

/**
 * Fallback reconciliation path: look up a payment's status directly from
 * Payoneer, for cases where a webhook was missed or delayed.
 *
 * TODO (blocked on real Payoneer docs): implement per Payoneer's payment
 * status lookup endpoint.
 *
 * @param {string} paymentId
 * @returns {Promise<'PENDING'|'PAID'|'FAILED'>}
 */
async function getPaymentStatus(paymentId) {
  assertConfigured();
  throw new Error('getPaymentStatus: Payoneer API call not yet implemented — see TODO above.');
}

module.exports = { createCheckoutSession, verifyWebhookSignature, getPaymentStatus, configured };
