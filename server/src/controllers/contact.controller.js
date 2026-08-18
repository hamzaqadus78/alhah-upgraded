const { sendContactEmail } = require('../services/email.service');

async function submitContact(req, res, next) {
  try {
    const { name, email, phone, subject, message } = req.body;
    await sendContactEmail({ name, email, phone, subject, message });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitContact };
