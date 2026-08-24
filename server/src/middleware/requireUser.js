const { USER_COOKIE, verifyUserToken } = require('../lib/auth');
const { HttpError } = require('./errorHandler');

function requireUser(req, res, next) {
  const token = req.cookies?.[USER_COOKIE];
  if (!token) return next(new HttpError(401, 'Not logged in.'));
  try {
    req.userId = verifyUserToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Session expired — please log in again.'));
  }
}

module.exports = { requireUser };
