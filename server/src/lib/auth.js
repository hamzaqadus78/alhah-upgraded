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

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
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
