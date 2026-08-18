const express = require('express');
const { createCheckoutSession } = require('../controllers/checkout.controller');
const { requireFields } = require('../middleware/validateBody');

const router = express.Router();

router.post('/session', requireFields(['orderId']), createCheckoutSession);

module.exports = router;
