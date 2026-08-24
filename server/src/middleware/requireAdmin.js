const { ADMIN_COOKIE, verifyAdminToken } = require('../lib/auth');
const { HttpError } = require('./errorHandler');

function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return next(new HttpError(401, 'Not logged in.'));
  try {
    req.adminId = verifyAdminToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Session expired — please log in again.'));
  }
}

module.exports = { requireAdmin };
