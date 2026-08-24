const { USER_COOKIE, verifyUserToken } = require('../lib/auth');

// Never rejects — leaves req.userId undefined if there's no valid session.
// Used on endpoints (like checkout) that must work for both guests and
// logged-in users.
function optionalUser(req, res, next) {
  const token = req.cookies?.[USER_COOKIE];
  if (token) {
    try {
      req.userId = verifyUserToken(token);
    } catch {
      // invalid/expired token — proceed as guest rather than failing the request
    }
  }
  next();
}

module.exports = { optionalUser };
