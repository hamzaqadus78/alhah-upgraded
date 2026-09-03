const express = require('express');
const rateLimit = require('express-rate-limit');
const authAdmin = require('../controllers/admin/authAdmin.controller');
const products = require('../controllers/admin/products.controller');
const orders = require('../controllers/admin/orders.controller');
const { uploadImage } = require('../controllers/admin/upload.controller');
const { requireAdmin } = require('../middleware/requireAdmin');
const { upload } = require('../middleware/upload');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// Auth — login is the only unprotected admin route.
router.post('/auth/login', loginLimiter, authAdmin.login);
router.post('/auth/logout', authAdmin.logout);
router.get('/auth/me', requireAdmin, authAdmin.me);

// Everything below requires an authenticated admin session.
router.use(requireAdmin);

router.get('/admins', authAdmin.listAdmins);
router.post('/admins', authAdmin.createAdmin);

router.post('/upload', upload.single('image'), uploadImage);

router.get('/products', products.listProducts);
router.post('/products', products.createProduct);
router.patch('/products/:id', products.updateProduct);
router.delete('/products/:id', products.deleteProduct);

router.get('/orders', orders.listOrders);
router.patch('/orders/:id/status', orders.updateOrderStatus);

module.exports = router;
