const express = require('express');
const rateLimit = require('express-rate-limit');
const { signup, login, logout, me, updateMe, myOrders } = require('../controllers/auth.controller');
const { requireUser } = require('../middleware/requireUser');

const router = express.Router();

// Basic brute-force throttle — 10 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/signup', loginLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireUser, me);
router.patch('/me', requireUser, updateMe);
router.get('/orders', requireUser, myOrders);

module.exports = router;
