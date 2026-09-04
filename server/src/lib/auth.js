const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USER_COOKIE = 'alhah_user_session';
const ADMIN_COOKIE = 'alhah_admin_session';
const USER_TOKEN_TTL = '7d';
const ADMIN_TOKEN_TTL = '12h';

function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signUserToken(user) {
  return jwt.sign({ sub: user.id }, process.env.USER_JWT_SECRET, { expiresIn: USER_TOKEN_TTL });
}

function verifyUserToken(token) {
  return jwt.verify(token, process.env.USER_JWT_SECRET).sub;
}

function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id }, process.env.ADMIN_JWT_SECRET, { expiresIn: ADMIN_TOKEN_TTL });
}

function verifyAdminToken(token) {
  return jwt.verify(token, process.env.ADMIN_JWT_SECRET).sub;
}

// Verification links (signup email confirm, checkout order confirm) use a
// separate secret from session cookies — a verification token must never
// be usable as a session token or vice versa, even if one leaked.
function signEmailVerifyToken(userId) {
  return jwt.sign({ purpose: 'verify-signup', sub: userId }, process.env.EMAIL_VERIFY_SECRET, { expiresIn: '24h' });
}

function verifyEmailVerifyToken(token) {
  const decoded = jwt.verify(token, process.env.EMAIL_VERIFY_SECRET);
  if (decoded.purpose !== 'verify-signup') throw new Error('Wrong token purpose.');
  return decoded.sub;
}

// Checkout confirmation carries the whole cart/customer payload in the
// token itself (rather than a database row) so nothing is persisted until
// the customer actually confirms — see order.service.js's beginCheckout.
function signCheckoutToken(payload, userId) {
  return jwt.sign({ purpose: 'verify-checkout', payload, userId: userId || null }, process.env.EMAIL_VERIFY_SECRET, { expiresIn: '30m' });
}

function verifyCheckoutToken(token) {
  const decoded = jwt.verify(token, process.env.EMAIL_VERIFY_SECRET);
  if (decoded.purpose !== 'verify-checkout') throw new Error('Wrong token purpose.');
  return { payload: decoded.payload, userId: decoded.userId };
}

// The site and API live on different subdomains (e.g. alhah-upgraded-1 vs
// alhah-upgraded.onrender.com), which browsers treat as separate "sites" —
// SameSite=Lax only survives full page navigations, not the background
// fetch() calls the dashboard makes right after loading, so it silently
// dropped the cookie. SameSite=None is required for cross-site fetches to
// carry cookies, and browsers mandate Secure whenever None is used — safe
// here since the API is always reached over HTTPS in every environment
// this runs in (local frontend dev included, since it still calls the
// HTTPS Render backend).
const cookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/',
};

module.exports = {
  USER_COOKIE,
  ADMIN_COOKIE,
  cookieOptions,
  hashPassword,
  verifyPassword,
  signUserToken,
  verifyUserToken,
  signAdminToken,
  verifyAdminToken,
  signEmailVerifyToken,
  verifyEmailVerifyToken,
  signCheckoutToken,
  verifyCheckoutToken,
};
