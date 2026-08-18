const { HttpError } = require('./errorHandler');

// Simple required-field checker — no schema library dependency for v1's small payloads.
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => req.body?.[f] === undefined || req.body?.[f] === null || req.body?.[f] === '');
    if (missing.length) {
      return next(new HttpError(400, `Missing required field(s): ${missing.join(', ')}`));
    }
    next();
  };
}

module.exports = { requireFields };
