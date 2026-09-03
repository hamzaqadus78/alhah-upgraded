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
};
