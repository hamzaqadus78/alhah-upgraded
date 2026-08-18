const express = require('express');
const { handlePayoneerWebhook } = require('../controllers/webhooks.controller');

const router = express.Router();

router.post('/payoneer', handlePayoneerWebhook);

module.exports = router;
